Run the existing life-digest task now. Do not create or change schedules.

Prepare the user's concise daily life briefing at 09:00 Europe/Belgrade. Use only the restricted-google skill/client and authorized accounts/allowlisted sheets. Honor mail cutoffs, follow all Gmail pagination, discover bounded sheet ranges, preserve formulas, and exclude tabs marked NO AUTOMATIONS. Active tracker tabs are Subscriptions, Taxes 2026, and Debt tracker.

Use this job's native notepad for the briefing date and item versions, plus the previous output supplied by continuity. If the notepad is absent, find this unique life-digest ID with hermes cron list. Keep pending briefing keys and their unique running execution ID; on the next run confirm delivery only from completed + delivered in the read-only /opt/data/cron/executions.db ledger. Failed/unknown/missing receipts remain pending. Never silently discard deduplication state.

Summarize new actionable mail, upcoming evidenced deadlines/renewals, and tracker changes that matter today. Avoid another alert for an unchanged item already reported today. A new day's digest may deliberately summarize still-open important items; distinguish that summary from a new event. Do not invent debt repayment dates, payments, tax deadlines or subscription cancellations. Google date-column numbers are serial days since 1899-12-30, not Unix timestamps; do not reinterpret amounts as dates.

This digest is read-only: do not modify Sheets or labels or create/send drafts. If no useful daily briefing exists, respond exactly [SILENT]. Otherwise return the concise briefing as the final response for automatic Telegram delivery, without sending it separately.
