# Qiwi.gg Downloader - TraxDB Downloader + mp3 converter

Qiwi.gg Downloader is a utility tool that facilitates downloading all files in a folder, hosted by `qiwi.gg`

## How it works

The script will:
1. Construct all final download urls of the provided qiwi folder through inspecting the html elements;
2. Next, it creates a directory with the provided folder name and concurrently downloads all files
3. Finally, it converts all downloaded files from FLAC to MP3 at 320KBPs.

## Setup

In `index.js`, update the global variables `parallelDownloads` and `downloadBasePath`:
- **parallelDownloads**: Defines how many links it'll concurrently fetch per batch;
- **downloadBasePath**: Base file path for the new release directory, where your `links.txt` file will end up at.

## Usage

Once variables are setup, run:

```
$ npm start <folder name> <qiwi.gg folder url>
```

The script concurrently downloads all files and save them to the directory provided.
