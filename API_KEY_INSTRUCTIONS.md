# How to Get Google Sheets API Key

## Step-by-Step:

1. Go to: https://console.cloud.google.com/apis/credentials

2. Make sure you're in the correct project (you should see your project name at the top)

3. Click "+ CREATE CREDENTIALS" button at the top

4. Select "API key" (NOT OAuth client ID)

5. A popup will show your new API key like:
   AIzaSyD...
   
6. (Optional but recommended) Click "RESTRICT KEY" and:
   - API restrictions: Select "Restrict key"
   - Choose "Google Sheets API"
   - Click Save

7. Copy the API key

8. Add it to your .env file

## Common Issues:

- If you only see OAuth options, make sure "Google Sheets API" is enabled first
- The API key starts with "AIzaSy..."
- It's different from OAuth Client ID (which ends with .apps.googleusercontent.com)

## Why API Key and not OAuth?

- API Key: For reading PUBLIC sheets (simpler, what we need)
- OAuth: For accessing PRIVATE sheets or writing data (more complex)

Since your sheets will be public and we're just reading, API key is perfect!
