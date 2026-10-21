# Sanity Schema Deployment Guide

## Quick Setup

After adding the contact form, you need to deploy the schema to Sanity Studio:

### 1. Deploy Schema

```bash
cd /path/to/your/project
npx sanity deploy
```

### 2. Check Studio

Visit your Sanity Studio at:

- Development: `http://localhost:3000/studio`
- Production: `https://yourdomain.com/studio`

### 3. Verify Contact Schema

You should see a new "Contact Messages" section in your Sanity Studio sidebar.

## Token Permissions

### Development

1. Go to https://sanity.io/manage
2. Select your project
3. Go to "API" tab
4. Create a new token with **Editor** permissions
5. Copy to your `.env` file as `SANITY_API_TOKEN`

### Production

1. Use the same token for production
2. Or create a separate production token
3. Set in your hosting platform environment variables

## Troubleshooting

### Error: "Insufficient permissions; permission 'create' required"

- Your `SANITY_API_TOKEN` needs **write/create** permissions
- Generate a new token with "Editor" or "Admin" role

### Error: "Schema type 'contact' not found"

- Run `npx sanity deploy` to deploy schema
- Check that `contactType` is exported in `sanity/schemaTypes/index.ts`

### Test Connection

Visit `/api/test-sanity` in your browser to test:

- Sanity connection
- Write permissions
- Schema deployment

## Schema Structure

The contact schema includes:

- Basic fields: name, email, subject, message
- Status tracking: new, read, replied, closed
- Priority levels: low, medium, high, urgent
- Metadata: submission time, IP address, user agent

## Managing Messages

In Sanity Studio you can:

- View all contact messages
- Update message status
- Set priority levels
- Sort by date, status, or priority
- Search and filter messages
