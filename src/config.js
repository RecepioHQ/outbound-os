function clean(value) {
  return String(value || '').trim();
}

function loadConfig(env = process.env) {
  const config = {
    live_requested: clean(env.OUTBOUND_OS_LIVE_SEND) === '1',
    accounts_base_url: clean(env.ZOHO_ACCOUNTS_BASE_URL) || 'https://accounts.zoho.com',
    mail_base_url: clean(env.ZOHO_MAIL_BASE_URL) || 'https://mail.zoho.com',
    account_id: clean(env.ZOHO_ACCOUNT_ID),
    from_address: clean(env.ZOHO_FROM_ADDRESS),
    client_id: clean(env.ZOHO_CLIENT_ID),
    client_secret: clean(env.ZOHO_CLIENT_SECRET),
    refresh_token: clean(env.ZOHO_REFRESH_TOKEN)
  };
  const required = ['account_id', 'from_address', 'client_id', 'client_secret', 'refresh_token'];
  config.missing = required.filter((key) => !config[key]);
  config.provider_ready = config.missing.length === 0;
  config.live_send = config.live_requested && config.provider_ready;
  return config;
}

module.exports = { loadConfig };
