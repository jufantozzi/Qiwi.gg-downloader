const puppeteer = require('puppeteer')
const fs = require('fs')

// Uncomment the following line if increasing parallel downloads is desired
// require('events').EventEmitter.defaultMaxListeners = 15;
const parallelDownloads = 9
const downloadBasePath = 'C:\\Music\\research\\2023\\'

getDownloadLinkByScriptTag = async (link) => {
    const browser = await puppeteer.launch({
        product: 'chrome',
        headless: 'new',
    });
    let page = await browser.newPage()
    await page.goto(link, {
        timeout: 60000
    })


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
        if (tag.content === null) {
            continue
        }
        if (!tag.content.includes('fileExtension')) {
            continue
        }

        // Find slug value
        // Sanitize string
        const sanitazedTagContent = tag.content.replace(/\\/g, '')
        // Find slug field starting index
        const slugIndex = sanitazedTagContent.indexOf('slug')
        const slugEndIndex = sanitazedTagContent.indexOf('"', slugIndex)
        // Find slug value indexes
        const slugValueStart = sanitazedTagContent.indexOf('"', slugEndIndex + 1)
        const slugValueEnd = sanitazedTagContent.indexOf('"', slugValueStart + 1);
        const slug = sanitazedTagContent.slice(slugValueStart + 1, slugValueEnd);

        const link = "https://spyderrock.com/" + slug + '.flac'
        
        await browser.close()
        console.log(link + ',' + fileName)
        return link + ',' + fileName
    }

    await browser.close()
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
// getDownloadLinkByScriptTag("https://qiwi.gg/file/wrqu0079-Alfio-Meganoidi")