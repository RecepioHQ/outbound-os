# Provider Adapters

## Zoho Mail

The v0.1 Zoho adapter uses only documented public Zoho interfaces:

- OAuth refresh: `POST {Accounts_URL}/oauth/v2/token`
- List mail: `GET {Mail_URL}/api/accounts/{accountId}/messages/view`
- Send mail: `POST {Mail_URL}/api/accounts/{accountId}/messages`
- Post-send reconciliation: `GET {Mail_URL}/api/accounts/{accountId}/messages/{messageId}/originalmessage`

Official references:

- https://www.zoho.com/mail/help/api/post-send-an-email.html
- https://www.zoho.com/mail/help/api/get-emails-list.html
- https://www.zoho.com/mail/help/api/
- https://www.zoho.com/connect/api/oauth-authentication-refreshing-access-tokens.html

### Live-send configuration

`OUTBOUND_OS_LIVE_SEND=1` is necessary but not sufficient. The adapter also requires:

- `ZOHO_ACCOUNT_ID`
- `ZOHO_FROM_ADDRESS`
- `ZOHO_CLIENT_ID`
- `ZOHO_CLIENT_SECRET`
- `ZOHO_REFRESH_TOKEN`

Account and Mail base URLs can be overridden for the user's Zoho data center.

### Read behavior

Read-only requests may retry clearly transient HTTP failures (`429` or `5xx`) up to three attempts.

Zoho list results are conservatively normalized using documented message fields. v0.1 recognizes common patterns for:

- human replies;
- automatic/out-of-office replies;
- permanent delivery failures;
- temporary delivery delays.

Normalization is deliberately conservative and not a complete RFC DSN parser. Events are applied only when the sender/failed target can be correlated to a contact already present in Outbound OS state. Unmatched inbox mail is ignored.

### Mutation behavior

Send mutations are never blindly retried. A transport exception or transient HTTP response after a mutation attempt is treated as `ambiguous` and requires reconciliation before another attempt.

The exact recipient, subject, plain-text body, and HTML are hashed during approval. Any change invalidates that approval before the provider call.

## Mailbox verification adapters

The core verification contract normalizes provider results to:

`valid | invalid | catch_all | unknown | error`

Only `valid` passes the default hard gate. The public v0.1 repository does not bundle credentials or a paid third-party verifier account; users can implement an adapter for the provider they are authorized to use.