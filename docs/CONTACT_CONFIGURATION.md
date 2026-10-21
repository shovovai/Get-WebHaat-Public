# Contact Configuration Guide

This project uses environment variables to manage contact information, making it easy to configure and update business details without changing code.

## Environment Variables

All contact-related configuration is stored in the `.env` file. Here are the available variables:

### Company Information

```bash
NEXT_PUBLIC_COMPANY_NAME=WebHaat                          # Your company name
NEXT_PUBLIC_COMPANY_EMAIL=support@webhaat.com             # Main company email
NEXT_PUBLIC_COMPANY_PHONE=+1 (555) 123-4567              # Main phone number
NEXT_PUBLIC_COMPANY_ADDRESS=123 Shopping Street, Commerce District  # Street address
NEXT_PUBLIC_COMPANY_CITY=New York, NY 10001, USA          # City, state, country
NEXT_PUBLIC_COMPANY_DESCRIPTION=Your company description   # Company description for footer
```

### Business Hours

```bash
NEXT_PUBLIC_COMPANY_BUSINESS_HOURS_WEEKDAY=Monday - Friday: 9AM - 6PM EST
NEXT_PUBLIC_COMPANY_BUSINESS_HOURS_WEEKEND=Saturday - Sunday: 10AM - 4PM EST
```

### Contact Emails

```bash
NEXT_PUBLIC_SUPPORT_EMAIL=support@webhaat.com             # Customer support email
NEXT_PUBLIC_SALES_EMAIL=sales@webhaat.com                 # Sales team email
```

### Response Times

```bash
NEXT_PUBLIC_CONTACT_RESPONSE_TIME=We reply within 24 hours
NEXT_PUBLIC_QUICK_RESPONSE_TIME=2-4 hours during business hours
```

### Social Media (Optional)

```bash
NEXT_PUBLIC_FACEBOOK_URL=https://facebook.com/webhaat
NEXT_PUBLIC_TWITTER_URL=https://twitter.com/webhaat
NEXT_PUBLIC_INSTAGRAM_URL=https://instagram.com/webhaat
NEXT_PUBLIC_LINKEDIN_URL=https://linkedin.com/company/webhaat
```

### Legal Pages

```bash
NEXT_PUBLIC_COPYRIGHT_TEXT=© 2024 WebHaat. All rights reserved.
NEXT_PUBLIC_PRIVACY_POLICY_URL=/privacy
NEXT_PUBLIC_TERMS_URL=/terms
```

## Usage

The configuration is automatically loaded and used throughout the application:

### Components that use contact config:

- **Contact Page** (`/contact`) - Main contact form and information display
- **Footer** - Company information and contact details
- **Header** - May include quick contact links (if implemented)

### Contact Form Integration

- Form submissions are saved to Sanity CMS with all provided details
- Email validation and error handling included
- Response confirmation with configured response times

### Clickable Contact Information

- Phone numbers become clickable (`tel:` links)
- Email addresses become clickable (`mailto:` links)
- Addresses link to Google Maps
- Social media links open in new tabs

## Configuration File

The main configuration is centralized in `/config/contact.ts` which reads from environment variables and provides fallback values.

## Benefits

1. **Easy Configuration** - Update `.env` file without touching code
2. **Environment-Specific Settings** - Different values for dev/staging/production
3. **Type Safety** - TypeScript support for all configuration values
4. **Consistent Usage** - Same contact info used across all components
5. **SEO Friendly** - Structured contact information for search engines

## Troubleshooting

### Contact Form Not Working

If you get a "Failed to send message" error:

1. **Check Sanity Token Permissions:**

   ```bash
   # Make sure your SANITY_API_TOKEN has write permissions
   # Go to https://sanity.io/manage and check your token permissions
   ```

2. **Verify Schema Deployment:**

   ```bash
   # Deploy your schema to Sanity Studio
   npm run sanity:deploy
   # or
   npx sanity deploy
   ```

3. **Test Connection:**

   ```bash
   # Visit /api/test-sanity in your browser to test the connection
   curl http://localhost:3000/api/test-sanity
   ```

4. **Common Issues:**
   - Using `client` instead of `writeClient` for mutations
   - Missing `SANITY_API_TOKEN` environment variable
   - Token doesn't have create permissions
   - Contact schema not deployed to Sanity

### Permission Requirements

The contact form requires:

- ✅ `SANITY_API_TOKEN` with **write/create** permissions
- ✅ Contact schema deployed to Sanity Studio
- ✅ Using `writeClient` for all create operations

## Development vs Production

For development, use `.env.local` or `.env.development`.
For production, set these variables in your hosting platform (Vercel, Netlify, etc.).

## Example Update

To change your phone number:

1. Update `NEXT_PUBLIC_COMPANY_PHONE=+1 (555) 999-8888` in `.env`
2. Restart development server
3. Phone number updates everywhere it's used

No code changes required!
