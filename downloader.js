const puppeteer = require('puppeteer')
const https = require('https')
const fs = require('fs')
const path = require('path')
const ffmpeg = require('fluent-ffmpeg')
const ProgressBar = require('progress')

// Uncomment the following line if increasing parallel downloads is desired
// require('events').EventEmitter.defaultMaxListeners = 15
const parallelDownloads = 9
const downloadBasePath = 'C:\\Music\\research\\2023\\'
let downloadPath

getDownloadLinkByScriptTag = async (link) => {
    const browser = await puppeteer.launch({
        product: 'chrome',
        headless: 'new',
    })
    let page = await browser.newPage()
    await page.goto(link, { timeout: 120000 })


    // find file name
    fileNameHandle = await page.$(".page_TextHeading__VsM7r")
    const fileName = await page.evaluate(element => element.textContent, fileNameHandle)

    // Use page.$$eval to get all script tags
    const scriptTags = await page.$$eval('script', (elements) => {
        return elements.map((element) => {
            return {
                src: element.getAttribute('src'),
                content: element.innerHTML,
            }
        })
    })


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
        const slugValueEnd = sanitazedTagContent.indexOf('"', slugValueStart + 1)
        const slug = sanitazedTagContent.slice(slugValueStart + 1, slugValueEnd)

        const link = "https://spyderrock.com/" + slug + '.flac'

        await browser.close()
        console.log(link + ',' + fileName)
        return link + ',' + fileName
    }

    await browser.close()
}

async function ParallelDownloadFiles(links) {
    console.log("Downloading files")
    const downloadPromises = links.map(link => {
        const [fileUrl, fileName] = link.split(',')
        return download(fileUrl, fileName, downloadPath + '\\' + fileName)
    })

    return downloadPromises
}

async function download(fileUrl, fileName, downloadPath) {
    return new Promise((resolve, reject) => {
        const options = {
            timeout: 120000,
        }

        const fileStream = fs.createWriteStream(downloadPath)

        const request = https.get(fileUrl, options, (response) => {
            if (response.statusCode === 200) {
                const totalSize = parseInt(response.headers['content-length'], 10)
                const progressBar = new ProgressBar(`[:bar] :percent :etas - ${fileName}`, {
                    complete: '=',
                    incomplete: ' ',
                    width: 40,
                    total: totalSize,
                })

                response.on('data', (chunk) => {
                    fileStream.write(chunk)
                    progressBar.tick(chunk.length)
                })

                response.on('end', () => {
                    fileStream.end()
                    resolve()
                })
            } else {
                reject(`Failed to download file: Status code ${response.statusCode}`)
            }
        })

        request.on('timeout', () => {
            request.destroy()
            reject('Request timed out')
        })

        request.on('error', (error) => {
            reject(`Request error: ${error}`)
        })

        fileStream.on('finish', () => {
            fileStream.close()
        })

        fileStream.on('error', (error) => {
            reject(`File write error: ${error}`)
        })
    })
}

function flac2mp3(filePath) {
    let mp3FilePath = filePath.replace(".flac", ".mp3")
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(filePath)
            .audioCodec('libmp3lame')  // Use the MP3 codec
            .audioBitrate(320)  // Set the desired bitrate
            .on('error', (err) => {
                console.error('Error:', err)
            })
            .on('end', () => {
                // Conversion completed, now remove the original file
                fs.unlink(filePath, (unlinkErr) => {
                    if (unlinkErr) {
                        console.error('Error deleting original file:', unlinkErr)
                        reject(unlinkErr)
                    } else {
                        console.log(`Conversion of ${filePath} completed.`)
                        resolve(mp3FilePath)
                    }
                })
            })
            .save(mp3FilePath)
    })
}

function getFiles(directoryPath) {
    const files = fs.readdirSync(directoryPath)

    // Filter out only files (not directories)
    const fileNames = files
        .filter((fileName) => {
            const filePath = path.join(directoryPath, fileName)
            return fs.statSync(filePath).isFile()
        })

    return fileNames
}

async function traxLinkGetter() {
    if (process.argv.length !== 4) {
        console.log("Usage: <download link> <release date>")
        return
    }
    const release = process.argv[2]
    const link = process.argv[3]

    downloadPath = downloadBasePath + release
    const browser = await puppeteer.launch({
        product: 'chrome',
        headless: false,
    })

    let page = await browser.newPage()


    await page.goto(link)

    unlockDownloadHandle = await page.$$(".DownloadButton_DownloadButton__Co0Pm")
    let links = unlockDownloadHandle.map(async (elementHandle) => {
        const link = await page.evaluate(element => element.getAttribute('href'), elementHandle)
        return link
    })
    console.log("Finding links")
    let preDownloadLinks = await Promise.all(links)

    let downloadLinksPromises = []
    let downloadLinks = []

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

    downloadLinks = downloadLinks.flat()

    await browser.close()
    // Create download directory
    fs.mkdirSync(downloadPath, { recursive: true })

    // writeDownloadLinks(downloadLinks)
    let downloadPromises = await ParallelDownloadFiles(downloadLinks)
    await Promise.all(downloadPromises)
    console.log("Download completed, converting files")

    const files = getFiles(downloadPath)
    // TODO: fix cleanup occuring before this
    // TODO: progress bar
    conversionPromises = files.map((file) => {
        const filePath = path.join(downloadPath, file)
        return flac2mp3(filePath)
    })

    // Wait for all conversions to complete
    await Promise.all(conversionPromises)

    console.log("Success!")
}

traxLinkGetter()