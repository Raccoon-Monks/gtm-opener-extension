function getStoredData(gtmIds, callback) {
  chrome.storage.local.get(gtmIds, result => {
    const data = {}
    gtmIds.forEach(gtmId => {
      // Default values if none stored
      const url = result[gtmId]?.url ?? ''
      const description = result[gtmId]?.description ?? ''
      const authuser = result[gtmId]?.authuser || (url && new URL(url).searchParams.get('authuser')) || '0'
      data[gtmId] = { url, description, authuser }
    })
    callback(data)
  })
}

chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
  const currentTab = tabs[0]
  if (currentTab) {
    chrome.scripting.executeScript(
      {
        target: { tabId: currentTab.id },
        world: 'MAIN',
        function: () => {
          const gtmIds = new Set()
          if (window.google_tag_manager) {
            for (const key in window.google_tag_manager) {
              if (key.startsWith('GTM-')) {
                gtmIds.add(key)
              }
            }
          }
          return Array.from(gtmIds)
        },
      },
      results => {
        const gtmList = document.getElementById('gtm-list')
        const gtms = results[0].result

        if (gtms && gtms.length > 0) {
          // Get stored data before creating the list
          getStoredData(gtms, data => {
            gtms.forEach(gtmId => {
              const url = data[gtmId].url
              const description = data[gtmId].description
              const authuser = data[gtmId].authuser
              const listItem = document.createElement('li')
              listItem.className = 'gtm-item'
              listItem.innerHTML = `
                <div style="margin-bottom: 8px;">
                  <span>${gtmId}</span>
                  <input
                    type="text"
                    class="description-input"
                    data-gtmid="${gtmId}"
                    value="${description}"
                    placeholder="Description"
                    style="width: 300px; margin: 0 8px; padding: 4px;"
                  />
                </div>
                <div style="display: flex; align-items: center;">
                  <input
                    type="text"
                    class="url-input"
                    data-gtmid="${gtmId}"
                    value="${url}"
                    style="width: 220px; margin: 0 8px; padding: 4px;"
                  />
                  <input
                    type="text"
                    class="authuser-input"
                    data-gtmid="${gtmId}"
                    value="${authuser}"
                    placeholder="authuser"
                    style="width: 40px; padding: 4px; text-aligh: center; margin-right: 8px;"
                  >
                  <button data-gtmid="${gtmId}">Abrir</button>
                </div>
              `
              gtmList.appendChild(listItem)
            })

            // Add event listeners for description input changes
            document.querySelectorAll('.description-input').forEach(input =>
              input.addEventListener('change', e => {
                const gtmId = e.target.dataset.gtmid
                const description = e.target.value
                const url = document.querySelector(`.url-input[data-gtmid="${gtmId}"]`).value
                const authuser = document.querySelector(`.authuser-input[data-gtmid="${gtmId}"]`).value
                chrome.storage.local.set({ [gtmId]: { url, description, authuser } })
              })
            )

            // Add event listeners for URL input changes
            document.querySelectorAll('.url-input').forEach(input =>
              input.addEventListener('change', e => {
                const gtmId = e.target.dataset.gtmid
                const description = document.querySelector(`.description-input[data-gtmid="${gtmId}"]`).input
                const url = new URL(e.target.value) // quebra se url inválida
                const authuser =
                  url.searchParams.get('authuser') ||
                  document.querySelector('.authuser-input[data-gtmid="${gtmId}"]').value ||
                  '0'
                chrome.storage.local.set({ [gtmId]: { url: url.href, description, authuser } })
              })
            )

            // Add event listeners for authuser changes
            document.querySelectorAll('.authuser-input').forEach(input =>
              input.addEventListener('change', e => {
                const gtmId = e.target.dataset.gtmid
                const description = document.querySelector(`.description-input[data-gtmid="${gtmId}"]`).input
                const url = new URL(document.querySelector(`.url-input[data-gtmid="${gtmId}"]`).value)
                const authuser = String(Math.round(e.target.value))
                chrome.storage.local.set({ [gtmId]: { url: url.href, description, authuser } })
              })
            )

            // Add event listeners for open buttons
            document.querySelectorAll('button[data-gtmid]').forEach(button =>
              button.addEventListener('click', e => {
                const gtmId = e.target.dataset.gtmid
                const authuser = document.querySelector(`.authuser-input[data-gtmid="${gtmId}"]`).value
                const url = new URL(document.querySelector(`.url-input[data-gtmid="${gtmId}"]`).value)
                url.searchParams.set('authuser', authuser)
                chrome.tabs.create({ url: url.href })
              })
            )
          })
        } else {
          gtmList.innerHTML = '<li>Nenhum GTM encontrado.</li>'
        }
      }
    )
  } else {
    console.error('No active tab found.')
  }
})
