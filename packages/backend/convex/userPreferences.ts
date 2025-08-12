/**
 * User preferences queries and mutations
 * Handles interface settings that sync across devices
 */

import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { getCurrentUser, requireAuth } from './authHelpers';

// Get user preferences by explicit userId (for server-to-server or http actions)
export const getByUserId = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const preferences = await ctx.db
      .query('userPreferences')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    return preferences;
  },
});

// Get user preferences
export const getUserPreferences = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return null;
    }

    const preferences = await ctx.db
      .query('userPreferences')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first();

    return preferences;
  },
});

// Create or update user preferences
export const updateUserPreferences = mutation({
  args: {
    // Interface Settings
    theme: v.optional(
      v.union(v.literal('light'), v.literal('dark'), v.literal('system'))
    ),
    language: v.optional(v.string()),
    soundEnabled: v.optional(v.boolean()),
    autoScroll: v.optional(v.boolean()),

    // Behavior Settings
    streamResponses: v.optional(v.boolean()),
    saveHistory: v.optional(v.boolean()),
    enableMemory: v.optional(v.boolean()),
    responseFormat: v.optional(
      v.union(v.literal('text'), v.literal('markdown'), v.literal('json'))
    ),

    // Model Preferences (defaults for new chats)
    defaultModel: v.optional(v.string()),
    defaultTemperature: v.optional(v.number()),
    defaultMaxTokens: v.optional(v.number()),
    defaultTopP: v.optional(v.number()),
    defaultFrequencyPenalty: v.optional(v.number()),
    defaultPresencePenalty: v.optional(v.number()),

    // Chat Preferences
    contextWindow: v.optional(v.number()),
    autoCreateTitles: v.optional(v.boolean()),

    // Notification Settings
    emailNotifications: v.optional(v.boolean()),
    pushNotifications: v.optional(v.boolean()),

    // Privacy Settings
    dataCollection: v.optional(v.boolean()),
    analytics: v.optional(v.boolean()),

    // Accessibility Settings
    reducedMotion: v.optional(v.boolean()),
    highContrast: v.optional(v.boolean()),
    fontSize: v.optional(
      v.union(v.literal('small'), v.literal('medium'), v.literal('large'))
    ),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    // Check if preferences already exist
    const existingPreferences = await ctx.db
      .query('userPreferences')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first();

    const updates: Record<string, unknown> = {
      userId: user._id,
      updatedAt: Date.now(),
    };

    // Add all provided settings
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    if (existingPreferences) {
      await ctx.db.patch(existingPreferences._id, updates);
      return await ctx.db.get(existingPreferences._id);
    }

    const defaults = {
      theme: 'system' as const,
      language: 'en',
      soundEnabled: true,
      autoScroll: true,
      streamResponses: true,
      saveHistory: true,
      enableMemory: true,
      responseFormat: 'markdown' as const,
      contextWindow: 10,
      autoCreateTitles: true,
      emailNotifications: false,
      pushNotifications: true,
      dataCollection: true,
      analytics: true,
      reducedMotion: false,
      highContrast: false,
      fontSize: 'medium' as const,
    };

    const preferencesId = await ctx.db.insert('userPreferences', {
      userId: user._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...defaults,
      ...updates,
    });
    return await ctx.db.get(preferencesId);
  },
});

// Reset user preferences to defaults
export const resetUserPreferences = mutation({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx);

    const existingPreferences = await ctx.db
      .query('userPreferences')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first();

    const defaultPreferences = {
      userId: user._id,
      theme: 'system' as const,
      language: 'en',
      soundEnabled: true,
      autoScroll: true,
      streamResponses: true,
      saveHistory: true,
      enableMemory: true,
      responseFormat: 'markdown' as const,
      contextWindow: 10,
      autoCreateTitles: true,
      emailNotifications: false,
      pushNotifications: true,
      dataCollection: true,
      analytics: true,
      reducedMotion: false,
      highContrast: false,
      fontSize: 'medium' as const,
      updatedAt: Date.now(),
    };

    if (existingPreferences) {
      await ctx.db.patch(existingPreferences._id, {
        ...defaultPreferences,
        createdAt: existingPreferences.createdAt,
      });
      return await ctx.db.get(existingPreferences._id);
    }
    const preferencesId = await ctx.db.insert('userPreferences', {
      ...defaultPreferences,
      createdAt: Date.now(),
    });
    return await ctx.db.get(preferencesId);
  },
});

// Get user preferences with fallbacks to defaults
export const getUserPreferencesWithDefaults = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      // Return defaults for non-authenticated users
      return {
        theme: 'system' as const,
        language: 'en',
        soundEnabled: true,
        autoScroll: true,
        streamResponses: true,
        saveHistory: true,
        enableMemory: true,
        responseFormat: 'markdown' as const,
        contextWindow: 10,
        autoCreateTitles: true,
        emailNotifications: false,
        pushNotifications: true,
        dataCollection: true,
        analytics: true,
        reducedMotion: false,
        highContrast: false,
        fontSize: 'medium' as const,
      };
    }

    const preferences = await ctx.db
      .query('userPreferences')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first();

    if (!preferences) {
      // Return defaults for users without preferences
      return {
        theme: 'system' as const,
        language: 'en',
        soundEnabled: true,
        autoScroll: true,
        streamResponses: true,
        saveHistory: true,
        enableMemory: true,
        responseFormat: 'markdown' as const,
        contextWindow: 10,
        autoCreateTitles: true,
        emailNotifications: false,
        pushNotifications: true,
        dataCollection: true,
        analytics: true,
        reducedMotion: false,
        highContrast: false,
        fontSize: 'medium' as const,
      };
    }

    return preferences;
  },
});

// Bulk update multiple preference categories
export const updatePreferenceCategory = mutation({
  args: {
    category: v.union(
      v.literal('interface'),
      v.literal('behavior'),
      v.literal('model'),
      v.literal('privacy')
    ),
    preferences: v.record(
      v.string(),
      v.union(v.string(), v.number(), v.boolean(), v.null())
    ), // Generic preferences object
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    const validatedPreferences: Record<string, unknown> = {};

    const p = args.preferences as Record<string, unknown>;
    if (args.category === 'interface') {
      if (p.theme !== undefined) validatedPreferences.theme = p.theme;
      if (p.language !== undefined) validatedPreferences.language = p.language;
      if (p.soundEnabled !== undefined)
        validatedPreferences.soundEnabled = p.soundEnabled;
      if (p.autoScroll !== undefined) validatedPreferences.autoScroll = p.autoScroll;
      if (p.fontSize !== undefined) validatedPreferences.fontSize = p.fontSize;
      if (p.reducedMotion !== undefined)
        validatedPreferences.reducedMotion = p.reducedMotion;
      if (p.highContrast !== undefined)
        validatedPreferences.highContrast = p.highContrast;
    } else if (args.category === 'behavior') {
      if (p.streamResponses !== undefined)
        validatedPreferences.streamResponses = p.streamResponses;
      if (p.saveHistory !== undefined) validatedPreferences.saveHistory = p.saveHistory;
      if (p.enableMemory !== undefined) validatedPreferences.enableMemory = p.enableMemory;
      if (p.responseFormat !== undefined)
        validatedPreferences.responseFormat = p.responseFormat;
      if (p.contextWindow !== undefined)
        validatedPreferences.contextWindow = p.contextWindow;
    } else if (args.category === 'model') {
      if (p.defaultModel !== undefined) validatedPreferences.defaultModel = p.defaultModel;
      if (p.defaultTemperature !== undefined)
        validatedPreferences.defaultTemperature = p.defaultTemperature;
      if (p.defaultMaxTokens !== undefined)
        validatedPreferences.defaultMaxTokens = p.defaultMaxTokens;
      if (p.defaultTopP !== undefined) validatedPreferences.defaultTopP = p.defaultTopP;
      if (p.defaultFrequencyPenalty !== undefined)
        validatedPreferences.defaultFrequencyPenalty = p.defaultFrequencyPenalty;
      if (p.defaultPresencePenalty !== undefined)
        validatedPreferences.defaultPresencePenalty = p.defaultPresencePenalty;
    } else if (args.category === 'privacy') {
      if (p.emailNotifications !== undefined)
        validatedPreferences.emailNotifications = p.emailNotifications;
      if (p.pushNotifications !== undefined)
        validatedPreferences.pushNotifications = p.pushNotifications;
      if (p.dataCollection !== undefined)
        validatedPreferences.dataCollection = p.dataCollection;
      if (p.analytics !== undefined) validatedPreferences.analytics = p.analytics;
    }

    if (Object.keys(validatedPreferences).length === 0) {
      throw new Error(
        'No valid preferences provided for the specified category'
      );
    }

    // Use internal call instead of api reference
    const existingPreferences = await ctx.db
      .query('userPreferences')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first();

    const patchDoc = {
      userId: user._id,
      updatedAt: Date.now(),
      ...validatedPreferences,
    };

    if (existingPreferences) {
      await ctx.db.patch(existingPreferences._id, patchDoc);
      return await ctx.db.get(existingPreferences._id);
    }
    const preferencesId = await ctx.db.insert('userPreferences', {
      ...patchDoc,
      createdAt: Date.now(),
    });
    return await ctx.db.get(preferencesId);
  },
});
