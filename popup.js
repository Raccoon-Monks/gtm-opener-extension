function getStoredData(gtmIds, callback) {
  chrome.storage.local.get(gtmIds, result => {
    const data = {}
    gtmIds.forEach(gtmId => {
      // Default values if none stored
      data[gtmId] = {
        url: result[gtmId]?.url ?? '',
        description: result[gtmId]?.description ?? '',
      }
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
              const listItem = document.createElement('li')
              listItem.className = 'gtm-item'
              listItem.innerHTML = `
                <div style="margin-bottom: 8px;">
                  <span>${gtmId}</span>
                  <input 
                    type="text" 
                    class="description-input" 
                    data-gtmid="${gtmId}" 
                    value="${data[gtmId].description}"
                    placeholder="Description"
                    style="width: 300px; margin-left: 8px;"
                  />
                </div>
                <div>
                  <input 
                    type="text" 
                    class="url-input" 
                    data-gtmid="${gtmId}" 
                    value="${data[gtmId].url}"
                    style="width: 220px"
                  />
                  <button data-gtmid="${gtmId}">Abrir</button>
                </div>
              `
              gtmList.appendChild(listItem)
            })

            // Add event listeners for URL input changes
            const urlInputs = document.querySelectorAll('.url-input')
            urlInputs.forEach(input => {
              input.addEventListener('change', e => {
                const gtmId = e.target.dataset.gtmid
                const url = e.target.value
                const descriptionInput = document.querySelector(`.description-input[data-gtmid="${gtmId}"]`)
                // Store the new URL while preserving the description
                chrome.storage.local.set({
                  [gtmId]: {
                    url: url,
                    description: descriptionInput.value,
                  },
                })
              })
            })

            // Add event listeners for description input changes
            const descriptionInputs = document.querySelectorAll('.description-input')
            descriptionInputs.forEach(input => {
              input.addEventListener('change', e => {
                const gtmId = e.target.dataset.gtmid
                const description = e.target.value
                const urlInput = document.querySelector(`.url-input[data-gtmid="${gtmId}"]`)
                // Store the new description while preserving the URL
                chrome.storage.local.set({
                  [gtmId]: {
                    url: urlInput.value,
                    description: description,
                  },
                })
              })
            })

            // Add event listeners for open buttons
            const openButtons = document.querySelectorAll('button[data-gtmid]')
            openButtons.forEach(button => {
              button.addEventListener('click', () => {
                const gtmId = button.dataset.gtmid
                const urlInput = document.querySelector(`.url-input[data-gtmid="${gtmId}"]`)
                const url = urlInput.value
                chrome.tabs.create({ url: url })
              })
            })
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
