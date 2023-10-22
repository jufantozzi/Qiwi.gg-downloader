const puppeteer = require('puppeteer')
const fs = require('fs')

// Uncomment the following line if increasing parallel downloads is desired
// require('events').EventEmitter.defaultMaxListeners = 15;
const parallelDownloads = 9
const downloadBasePath = 'C:\\Music\\research\\2023\\'

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function lookup(obj, k) {
    for (var key in obj) {
        var value = obj[key]

        if (k == key) {
            return [k, value]
        }

        if (typeof (value) === "object" && !Array.isArray(value)) {
            var y = lookup(value, k)
            if (y && y[0] == k) return y
        }
        if (Array.isArray(value)) {
            for (var i = 0; i < value.length; ++i) {
                var x = lookup(value[i], k)
                if (x && x[0] == k) return x
            }
        }
    }

    return null
}

// not being currently used, proven to be inconsistent
getDownloadLinkByClicks = async (link) => {
    const browser = await puppeteer.launch({
        product: 'chrome',
        headless: true,
    });
    await sleep(500)
    let page = await browser.newPage()
    await page.goto(link)
    await sleep(2000)

    // first click opens ad page
    let errNoClass = false
    try {
        // lol
        await page.click(".DownloadButton_ButtonSoScraperCanTakeThisName__gVd3C")
    } catch (error) {
        console.log("with button no class")
        errNoClass = true
    }

    let unlockButtonHandler = []

    if (errNoClass) {
        for (let i = 15; i < 40; i++) {


            d = await page.$$(`body > div:nth-child(${i})`)

            if (d.length !== 0) {
                unlockButtonHandler.push(d[0])
                try {
                    await d[0].click()

                } catch (error) {
                    console.log("not clickable")
                }
            }
        }
    }


    await sleep(3000)

    // Closing ad page
    let pages = await browser.pages()

    let adPage = pages[2]
    await adPage.close()
    await sleep(5000)

    // Unlocks download button
    if (errNoClass) {
        for (let el of unlockButtonHandler) {
            el.click()
        }
    } else {
        await page.click(".DownloadButton_ButtonSoScraperCanTakeThisName__gVd3C")
    }

    // Find and return download link
    await sleep(2500)

    downloadHandle = await page.$(".DownloadButton_DownloadButton__qwe2g ")
    const downloadLink = await page.evaluate(element => element.getAttribute('href'), downloadHandle)

    await browser.close()

    return downloadLink
}

getDownloadLinkByScriptTag = async (link) => {
    const browser = await puppeteer.launch({
        product: 'chrome',
        headless: "new",
    });
    await sleep(500)
    let page = await browser.newPage()
    await page.goto(link)
    await sleep(1000)


    // find file name
    fileNameHandle = await page.$(".page_TextHeading__VsM7r")
    const fileName = await page.evaluate(element => element.textContent, fileNameHandle)

    // Use page.$$eval to get all script tags
    const scriptTags = await page.$$eval('script', (elements) => {
        return elements.map((element) => {
            return {
                src: element.getAttribute('src'),
                content: element.innerHTML,
            };
        });
    });


    for (const tag of scriptTags) {
        if (tag.content == null) {
            return
        }
        if (tag.content.includes('fileExtension')) {
            // Remove 26 initial characters
            const step1 = tag.content.substring(25)

            // Remove the last character
            const step2 = step1.slice(0, -1)

            // Remove trailing quotes if present
            const step3 = step2.replace(/"$/, '').replace(/^"/, '')

            const step4 = step3.replace(/\\"/g, '"')

            const step5 = step4.slice(0, -4)

            // Parse as JSON

            link = "https://spyderrock.com/"
            try {
                const parsedJSON = JSON.parse(step5)
                link = link + lookup(parsedJSON, "slug")[1] + '.flac'
                await browser.close()
                return link + ',' + fileName
            } catch (error) {
                console.error('Error parsing JSON:', error)
            }
        }
    }
}

async function traxLinkGetter() {
    if (process.argv.length !== 4) {
        console.log("Usage: <download link> <release date>")
        return
    }
    const release = process.argv[2]
    const link = process.argv[3]

    const downloadPath = downloadBasePath + release;

    const browser = await puppeteer.launch({
        product: 'chrome',
        headless: false, // or false if you want to see the browser
    });

    let page = await browser.newPage()


    await page.goto(link)
    await sleep(1500)

    unlockDownloadHandle = await page.$$(".DownloadButton_DownloadButton__Co0Pm"),

        links = unlockDownloadHandle.map(async (elementHandle) => {
            const link = await page.evaluate(element => element.getAttribute('href'), elementHandle)
            return link
        })

    preDownloadLinks = await Promise.all(links)

    downloadLinksPromises = []
    downloadLinks = []

    curr = 0
    for (let i = 0; i < preDownloadLinks.length; i++) {
        downloadLinksPromises.push(getDownloadLinkByScriptTag(preDownloadLinks[i]))
        curr++
        if (curr >= parallelDownloads) {
            links = await Promise.all(downloadLinksPromises)
            downloadLinks.push(links)
            curr = 0
            downloadLinksPromises = []
        }
    }

    if (curr !== 0) {
        links = await Promise.all(downloadLinksPromises)
        downloadLinks.push(links)
    }

    downloadLinks = downloadLinks.flat();

    await browser.close()

    fs.mkdirSync(downloadPath, { recursive: true })
    const writeStream = fs.createWriteStream(downloadPath + "\\links.txt", { flags: 'w' })

    downloadLinks.forEach((line) => {
        writeStream.write(line + '\n')
    });

    writeStream.end()

    writeStream.on('finish', () => {
        console.log('Created links file:', downloadPath + "\\links.txt")
    });

    writeStream.on('error', (err) => {
        console.error('Error writing to file:', err)
    });

    // Copy downloader script to release folder
    fs.readFile("downloader.sh", (err, data) => {
        if (err) {
            console.error('Error reading the source file:', err)
            return
        }

        fs.writeFile(downloadPath + "\\downloader.sh", data, (err) => {
            if (err) {
                console.error('Error writing the destination file:', err)
                return;
            }

            console.log('Copied download script file to:', downloadPath)
        })
    })

}

traxLinkGetter()