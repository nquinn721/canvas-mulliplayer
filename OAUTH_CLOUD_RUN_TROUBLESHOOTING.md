# Google OAuth Cloud Run Troubleshooting Guide

## Quick Diagnosis

Visit your Cloud Run service at: `https://YOUR-SERVICE-URL/api/auth/debug`

## Common Issues & Solutions

### 1. **Callback URL Mismatch** ⚠️

**Problem:** Google OAuth app has wrong callback URL
**Solution:** Update your Google Cloud Console OAuth app with:

```
https://YOUR-CLOUD-RUN-SERVICE-URL/api/auth/google/callback
```

### 2. **Missing Environment Variables** ⚠️

**Problem:** Secrets not properly injected into Cloud Run
**Fix:** Check your Cloud Run service environment variables:

```bash
# Check current service config
gcloud run services describe YOUR-SERVICE-NAME --region=YOUR-REGION

# Update with secrets (if using Cloud Build)
gcloud run services update YOUR-SERVICE-NAME \
  --set-env-vars="GOOGLE_CALLBACK_URL=https://YOUR-SERVICE-URL/api/auth/google/callback" \
  --set-env-vars="FRONTEND_URL=https://YOUR-SERVICE-URL" \
  --region=YOUR-REGION
```

### 3. **Auto-Detection Logic** ✅

The code now auto-detects Cloud Run URLs using:

- `SERVICE_URL` or `CLOUD_RUN_URL` environment variables
- `K_SERVICE` (Cloud Run service name)
- `K_REVISION` (Cloud Run revision)

### 4. **Frontend URL Issues** ⚠️

**Problem:** OAuth callback redirects to wrong frontend URL
**Solution:** Set `FRONTEND_URL` environment variable in Cloud Run:

```
FRONTEND_URL=https://your-cloud-run-service.run.app
```

### 5. **Debugging Steps**

1. **Check OAuth Status:**

   ```
   curl https://YOUR-SERVICE-URL/api/auth/oauth-status
   ```

2. **Test OAuth Flow:**
   - Visit: `https://YOUR-SERVICE-URL/api/auth/debug`
   - Click "Test Google Login"
   - Check for errors in callback

3. **Check Cloud Run Logs:**
   ```bash
   gcloud logs read --service=YOUR-SERVICE-NAME --limit=50
   ```

### 6. **Required Google Cloud Console Settings**

In your Google Cloud Console OAuth app:

1. **Authorized JavaScript origins:**

   ```
   https://your-cloud-run-service.run.app
   ```

2. **Authorized redirect URIs:**
   ```
   https://your-cloud-run-service.run.app/api/auth/google/callback
   ```

### 7. **Environment Variables Checklist**

Required in Cloud Run:

- ✅ `GOOGLE_CLIENT_ID` (from Secret Manager)
- ✅ `GOOGLE_CLIENT_SECRET` (from Secret Manager)
- ✅ `FRONTEND_URL` (your service URL)
- ✅ `GOOGLE_CALLBACK_URL` (auto-detected if not set)

Optional but recommended:

- `SERVICE_URL` - Your Cloud Run service URL
- `NODE_ENV=production`

### 8. **Testing Commands**

```bash
# Test OAuth status
curl -s https://YOUR-SERVICE/api/auth/oauth-status | jq

# Test Google OAuth initiation (should redirect)
curl -I https://YOUR-SERVICE/api/auth/google

# Check debug page
open https://YOUR-SERVICE/api/auth/debug
```

## Success Indicators

- ✅ OAuth status shows "google.configured: true"
- ✅ Debug page shows all URLs correctly
- ✅ Google login redirects back with token
- ✅ No CORS errors in browser console

## Next Steps

After OAuth is working:

1. Test complete login flow
2. Verify token persistence
3. Test with multiple users
4. Monitor Cloud Run logs for errors
