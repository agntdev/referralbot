# Referral Bot — Bot specification

**Archetype:** custom

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

Admin-only Telegram bot for creating and posting referral messages using templates. Collects form inputs, generates message previews, and posts to a configured group/channel with confirmation notifications.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- bot owner/administrator

## Success criteria

- Referral message successfully posted to configured Telegram group/channel
- Admin receives confirmation notification after posting
- History of up to 100 referrals stored and accessible

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open main menu with referral creation and history options
- **/new** (command, actor: user, command: /new) — Start new referral submission flow
- **/history** (command, actor: user, command: /history) — View recent referral submissions
- **Confirm** (button, actor: user, callback: confirm:referral) — Post referral message to configured destination
- **Edit** (button, actor: user, callback: edit:referral) — Modify referral inputs after preview

## Flows

### Referral Creation
_Trigger:_ /new

1. Collect candidate name
2. Collect description/reason
3. Collect contact/link (optional)
4. Collect tags/role (optional)
5. Generate message preview
6. Confirm or edit

_Data touched:_ referral_submission

### Message Posting
_Trigger:_ confirm:referral

1. Validate destination configuration
2. Format message with template
3. Post to Telegram group/channel
4. Send confirmation DM to admin

_Data touched:_ referral_submission, destination_config

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **referral_template** _(retention: persistent)_ — Message template with placeholders for dynamic fields
  - fields: template_text, version
- **referral_submission** _(retention: persistent)_ — Completed referral form with metadata
  - fields: candidate_name, description, contact, tags, timestamp, author
- **destination_config** _(retention: persistent)_ — Telegram group/channel ID for posting
  - fields: chat_id, last_updated

## Integrations

- **Telegram** (required) — Bot API messaging and group posting
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Set primary destination group/channel
- Manage referral templates
- View/edit referral history
- Re-post previous referrals

## Notifications

- DM confirmation after successful message posting
- Error notifications for failed posts

## Permissions & privacy

- Only owner's Telegram ID is authorized
- All referral data stored locally
- No third-party data sharing

## Edge cases

- No destination configured when attempting to post
- Invalid Telegram chat ID format
- Template placeholders missing during rendering
- Form submission abandoned mid-flow

## Required tests

- End-to-end referral flow from form to posting
- Template rendering with all field permutations
- History listing and re-post functionality
- Error handling for invalid destinations

## Assumptions

- Single admin account model
- Default template provided at setup
- One active destination maintained
- Sequential Q&A UX for form input
