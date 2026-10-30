# Google Sign-in

## Supabase
Enable Google under Auth Providers. Use the Google OAuth client ID and secret from Google Auth Platform.

## Google configuration
Create a Web application OAuth client. Configure authorized JavaScript origins for localhost, staging and production. Configure the Supabase callback URL required by the provider and add application redirect URLs in Supabase Auth URL configuration.

## Frontend
Use `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '<site>/auth/callback' } })`.

The supplied callback screen exchanges the PKCE code when present, then resolves the profile/role and routes to player/admin.

## Data policy
Do not request Google scopes beyond authentication unless a product feature genuinely needs them. Do not retain Google provider tokens for basic sign-in.
