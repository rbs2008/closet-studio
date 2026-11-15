# Online image search setup

The phone upload flow can search a selected clothing photo with Google Cloud Vision Web Detection. It returns possible image URLs and page titles; results can be incomplete or unrelated, so review the match before saving it. The selected image URL and title are stored in the browser's local wardrobe.

Automatic search is disabled until a Cloudflare Worker is deployed and its public `/search` URL is added to `IMAGE_SEARCH_ENDPOINT` in `index.html`. The phone can still save the uploaded photo or use the manual Google Lens link.

## What this sends

When someone taps **Find an online photo and title**, Closet Studio sends a resized JPEG to the Closet Studio Cloudflare Worker, which forwards it to Google Cloud Vision Web Detection. The Worker does not intentionally log or store the image. Cloudflare processes the request, and Google receives the image and processes it under Google's terms. The app does not upload the photo to GitHub or save it on the Worker. Only a selected online image URL and item details are saved in the device's browser storage.

## Create Google Cloud credentials

1. Create or choose a Google Cloud project.
2. Enable the [Cloud Vision API](https://console.cloud.google.com/marketplace/product/google/vision.googleapis.com).
3. Configure billing and create a service account for the Worker.
4. Grant the service account the **Service Usage Consumer** role on the project; it includes `serviceusage.services.use` for project quota use.
5. Create a JSON key for the service account. Treat the downloaded file as a secret; do not put it in `index.html`, GitHub, or this setup guide. Delete the local copy after storing it as a Cloudflare secret, and rotate the key if it is ever exposed.
6. Review the current [Cloud Vision pricing](https://cloud.google.com/vision/pricing). Pricing lists the first 1,000 feature units per month as free; usage after that is billed. Set API quotas and billing alerts before enabling the public search endpoint.

## Deploy the Cloudflare Worker

1. Sign in to Cloudflare and create a Worker named `closet-studio-image-search`.
2. Paste the contents of `image-search-worker.js` into the Worker editor and deploy it.
3. In the Worker's **Settings → Variables and Secrets**, add `GOOGLE_SERVICE_ACCOUNT_JSON` as a secret. Paste the complete contents of the service-account JSON key file.
4. Deploy the Worker again after adding the secret.
5. The search endpoint will be `https://<worker-name>.<your-cloudflare-subdomain>.workers.dev/search`.
6. Configure a Cloudflare rate-limit rule for this public endpoint and keep the Google API quota limited. CORS only restricts browsers; it does not prevent non-browser clients from calling a public endpoint. The Worker accepts browser requests from `https://rbs2008.github.io`; change `APP_ORIGIN` only if the app's public origin changes.

## Connect the app

Set `IMAGE_SEARCH_ENDPOINT` near the top of the inline app script in `index.html` to the Worker's `/search` URL, for example:

```js
const IMAGE_SEARCH_ENDPOINT = 'https://closet-studio-image-search.example.workers.dev/search';
```

Commit and publish the app after configuring the endpoint. Also increment `CACHE_NAME` in `service-worker.js` so installed copies receive the updated endpoint. The app will then show the online-search option after a phone photo is selected. The user must tap the button to send the resized image. The first possible match is selected automatically, but the title, image, and type remain editable before saving.
