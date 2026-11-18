# Hermes Assistants data use

Updated November 18, 2026.

Hermes Assistants is a personal assistant operated by the owner of this repository for their own accounts. It is not a public service and does not register other users.

The life assistant accesses newly arriving Gmail messages and the Google Sheets explicitly selected by the operator. It uses this information to identify actionable mail, track subscriptions and obligations, propose drafts, and make evidence-backed tracker updates. Its connector supports custom Gmail labels and drafts; it has no email-send, archive, delete, or mark-read endpoint. The operator reviews and sends drafts in Gmail.

Selected mail and tracker content may be processed by the configured AI provider to carry out the requested tasks. Notifications are sent to the operator's authorized private Telegram chat. The deployment uses Railway for hosting, Google for Gmail/Sheets access, Telegram for chat, and the operator's configured OpenAI subscription for model access. Those providers' account settings and policies also apply.

Google authorization credentials are kept in the Google connector's private volume. Bot tokens and the connector key use Railway variables. Native model/GitHub sessions, chat history, scheduled-task memory and audit records persist in the corresponding private service volume. The coding assistant has its own private state and cannot access the Google connector's private network. The public GitHub repository contains source and operating documentation, not account credentials or tracker contents.

This application does not sell Google user data, use it for advertising, or use it to train a model. It processes data to provide the personal assistance configured by the operator. Private runtime state is retained until the operator removes it. The operator can revoke Google access through their Google Account's third-party connections settings and stop the Railway services at any time; revocation alone does not delete already stored history or backups.

The repository owner controls this personal deployment. Questions about this notice can be raised through the repository's issue tracker without including private data or credentials.
