chrome.contextMenus.create({
  title: 'Copy to SiYuan',
  contexts: ['selection', 'image'],
  onclick: siyuan,
})

function siyuan(info, tab) {
  chrome.tabs.sendMessage(tab.id, {
    'func': 'copy',
    'tabId': tab.id,
    'srcUrl': info.srcUrl,
  })
}

chrome.webRequest.onHeadersReceived.addListener(
  function (details) {
    let existAllowOrigin = false
    for (let i = 0; i < details.responseHeaders.length; i++) {
      if ('access-control-allow-origin' ===
        details.responseHeaders[i].name.toLowerCase()) {
        existAllowOrigin = true
        break
      }
    }

    if (!existAllowOrigin) {
      const cors = {name: 'Access-Control-Allow-Origin', value: '*'}
      return {responseHeaders: details.responseHeaders.concat(cors)}
    }
    return {responseHeaders: details.responseHeaders}
  },
  {
    urls: ['*://*/*'],
  },
  ['blocking', 'responseHeaders', 'extraHeaders'],
)

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.func !== 'upload-copy') {
    return
  }

  const dom = JSON.parse(request.dom);
  const files = JSON.parse(request.files);
  const formData = new FormData();
  formData.append("dom", dom);
  Object.keys(files).forEach((key) => {
    const base64 = files[key];
    fetch(base64).then(res => res.blob()).then(formData.append(key, res))
  })
  fetch(request.api + '/api/extension/copy', {
    method: 'POST',
    body: formData,
  }).then((response) => {
    return response.json()
  }).then((response) => {
    if (response.code < 0) {
      chrome.tabs.sendMessage(request.tabId, {
        "func": "tip",
        "msg": response.msg,
        "tip": request.tip,
      })
      return;
    }

    chrome.tabs.sendMessage(request.tabId, {
      "func": "copy2Clipboard",
      'data': response.data.md,
    })

    if ('' !== response.msg) {
      chrome.tabs.sendMessage(request.tabId, {
        "func": "tip",
        "msg": response.msg,
        "tip": request.tip,
      })
    }
  }).catch((e) => {
    console.warn('fetch post error', e)
  })
});
