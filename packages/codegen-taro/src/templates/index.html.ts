export function generateIndexHtml(projectName: string): string {
  return '<!DOCTYPE html>\n' +
    '<html>\n' +
    '<head>\n' +
    '  <meta content="text/html; charset=utf-8" http-equiv="Content-Type">\n' +
    '  <meta content="width=device-width,initial-scale=1,user-scalable=no" name="viewport">\n' +
    '  <meta name="apple-mobile-web-app-capable" content="yes">\n' +
    '  <meta name="apple-touch-fullscreen" content="yes">\n' +
    '  <meta name="format-detection" content="telephone=no,address=no">\n' +
    '  <meta name="apple-mobile-web-app-status-bar-style" content="white">\n' +
    '  <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" >\n' +
    '  <title>' + projectName + '</title>\n' +
    '  <script><%= htmlWebpackPlugin.options.script %></script>\n' +
    '</head>\n' +
    '<body>\n' +
    '  <div id="app"></div>\n' +
    '</body>\n' +
    '</html>\n'
}
