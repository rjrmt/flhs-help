/* Vercel Web Analytics for this static site.
   FLHS Help is plain HTML (not Next.js), so we use the HTML inject
   snippet instead of `@vercel/analytics/next`.
   Enable Web Analytics in the Vercel project dashboard. */
(() => {
  window.va =
    window.va ||
    function va() {
      (window.vaq = window.vaq || []).push(arguments);
    };

  const script = document.createElement("script");
  script.defer = true;
  script.src = "/_vercel/insights/script.js";
  document.head.appendChild(script);
})();
