const { pgTable, serial, text, timestamp, boolean, varchar } = require('drizzle-orm/pg-core');
const { relations } = require('drizzle-orm');

// Guilds table - stores Discord server information
const guilds = pgTable('guilds', {
  id: serial('id').primaryKey(),
  guildId: varchar('guild_id', { length: 20 }).notNull().unique(),
  notificationChannelId: varchar('notification_channel_id', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Streamers table - stores Twitch streamers being monitored
const streamers = pgTable('streamers', {
  id: serial('id').primaryKey(),
  guildId: varchar('guild_id', { length: 20 }).notNull(),
  username: varchar('username', { length: 50 }).notNull(),
  isLive: boolean('is_live').default(false).notNull(),
  customMessage: text('custom_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Relations
const guildsRelations = relations(guilds, ({ many }) => ({
  streamers: many(streamers),
}));

const streamersRelations = relations(streamers, ({ one }) => ({
  guild: one(guilds, {
    fields: [streamers.guildId],
    references: [guilds.guildId],
  }),
}));

module.exports = {
  guilds,
  streamers,
  guildsRelations,
  streamersRelations
};