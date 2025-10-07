/**
 * ReDoc HTML template for API documentation
 * Generates a styled HTML page that loads the OpenAPI spec and renders it with ReDoc
 */
export function getRedocHtml(specUrl: string): string {
  return `
<!DOCTYPE html>
<html>
  <head>
    <title>Backend API Documentation</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    <style>
      body {
        margin: 0;
        padding: 0;
      }
      .redoc-wrap {
        background: #fafafa;
      }
      /* Custom background for code blocks only (not inline code) - Atom One Dark style */
      .redoc-markdown pre {
        background-color: #282C34 !important;
        border-radius: 6px !important;
        padding: 16px !important;
        margin: 16px 0 !important;
      }
      /* Keep inline code with default styling */
      .redoc-markdown code:not(pre code) {
        /* Let ReDoc handle inline code styling */
      }
    </style>
  </head>
  <body>
    <redoc 
      spec-url='${specUrl}' 
      theme='{
        "colors": {
          "primary": {"main": "#3b82f6"},
          "success": {"main": "#10b981"},
          "warning": {"main": "#f59e0b"},
          "error": {"main": "#ef4444"}
        }, 
        "typography": {
          "fontSize": "14px", 
          "lineHeight": "1.5em", 
          "code": {"fontSize": "13px", "fontFamily": "Consolas, Monaco, Courier New, monospace"}, 
          "headings": {
            "fontFamily": "Montserrat, sans-serif", 
            "fontWeight": "400"
          }
        }, 
        "sidebar": {
          "backgroundColor": "#f8fafc",
          "width": "260px"
        },
        "rightPanel": {
          "backgroundColor": "#263238"
        }
      }'
      scroll-y-offset="0"
      hide-download-button="false"
      disable-search="false"
      expand-responses="200,201"
      required-props-first="true"
      sort-props-alphabetically="false"
      show-extensions="false"
      native-scrollbars="false"
      path-in-middle-panel="false"
      suppress-warnings="false"
      payload-sample-idx="0"
    ></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  </body>
</html>
  `;
}
