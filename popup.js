function getStoredData(ids, callback) {
  chrome.storage.local.get(ids, result => {
    const data = {}
    ids.forEach(id => {
      // Default values if none stored
      const url = result[id]?.url ?? ''
      const description = result[id]?.description ?? ''
      const authuser = result[id]?.authuser || (url && new URL(url).searchParams.get('authuser')) || '0'

      data[id] = { url, description, authuser }
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
          const gtms = []
          if (window.google_tag_manager) {
            for (const key in window.google_tag_manager) {
              if (key.startsWith('GTM-')) {
                gtms.push(key)
              }
            }
          }
          const gaIds = performance
            .getEntriesByType('resource')
            .filter(e => e.name.includes('gtag/js?id=G-'))
            .map(e => e.name.match(/G-\w+/)[0])
          return [...gtms, ...gaIds]
        },
      },
      results => {
        const gtmList = document.getElementById('gtm-list')
        const gaList = document.getElementById('ga-list')
        const containers = results[0].result // GTMs e GTAGs

        if (containers && containers.length > 0) {
          // Get stored data before creating the list
          getStoredData(containers, data => {
            containers.forEach(containerId => {
              const url = data[containerId].url
              const description = data[containerId].description
              const authuser = data[containerId].authuser
              const listItem = document.createElement('li')
              const containerType = containerId.startsWith('GTM-') ? 'gtm' : 'ga'
              listItem.innerHTML = `
                <div style="margin-bottom: 8px;">
                  <span>${containerId}</span>
                  <input
                    type="text"
                    class="description-input"
                    data-containerid="${containerId}"
                    value="${description}"
                    placeholder="Description"
                    style="width: 300px; margin: 0 8px; padding: 4px;"
                  />
                </div>
                <div style="display: flex; align-items: center;">
                  <input
                    type="text"
                    class="url-input"
                    data-containerid="${containerId}"
                    value="${url}"
                    style="width: 220px; margin: 0 8px; padding: 4px;"
                  />
                  <input
                    type="text"
                    class="authuser-input"
                    data-containerid="${containerId}"
                    value="${authuser}"
                    placeholder="authuser"
                    style="width: 40px; padding: 4px; text-align: center; margin-right: 8px;"
                  >
                  <button data-containerid="${containerId}">Abrir</button>
                </div>
              `
              ;(containerType === 'gtm' ? gtmList : gaList).appendChild(listItem)
            })

            // Add event listeners for description input changes
            document.querySelectorAll('.description-input').forEach(input =>
              input.addEventListener('change', e => {
                const containerId = e.target.dataset.containerid
                const description = e.target.value
                const url = document.querySelector(`.url-input[data-containerid="${containerId}"]`).value
                const authuser = document.querySelector(`.authuser-input[data-containerid="${containerId}"]`).value
                chrome.storage.local.set({ [containerId]: { url, description, authuser } })
              })
            )

            // Add event listeners for URL input changes
            document.querySelectorAll('.url-input').forEach(input =>
              input.addEventListener('change', e => {
                const containerId = e.target.dataset.containerid
                const description = document.querySelector(
                  `.description-input[data-containerid="${containerId}"]`
                ).value
                const url = new URL(e.target.value) // quebra se url inválida
                const authuser =
                  url.searchParams.get('authuser') ||
                  document.querySelector(`.authuser-input[data-containerid="${containerId}"]`).value ||
                  '0'
                chrome.storage.local.set({ [containerId]: { url: url.href, description, authuser } })
              })
            )

            // Add event listeners for authuser changes
            document.querySelectorAll('.authuser-input').forEach(input =>
              input.addEventListener('change', e => {
                const containerId = e.target.dataset.containerid
                const description = document.querySelector(
                  `.description-input[data-containerid="${containerId}"]`
                ).value
                const url = new URL(document.querySelector(`.url-input[data-containerid="${containerId}"]`).value)
                const authuser = String(Math.round(e.target.value))
                chrome.storage.local.set({ [containerId]: { url: url.href, description, authuser } })
              })
            )

            // Add event listeners for open buttons
            document.querySelectorAll('button[data-containerid]').forEach(button =>
              button.addEventListener('click', e => {
                const containerId = e.target.dataset.containerid
                const authuser = document.querySelector(`.authuser-input[data-containerid="${containerId}"]`).value
                const url = new URL(document.querySelector(`.url-input[data-containerid="${containerId}"]`).value)
                url.searchParams.set('authuser', authuser)
                chrome.tabs.create({ url: url.href })
              })
            )
          })
        }
      }
    )
  } else {
    console.error('No active tab found.')
  }
})
