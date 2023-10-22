# Qiwi.gg Downloader

Qiwi.gg Downloader is a utility tool that facilitates downloading all files in a folder, hosted by `qiwi.gg`

## How it works

First, the JS script gathers all the final download links of the provided qiwi folder. Next, it creates a directory with the folder name and a text file with all the links, while also copying the bash script to the newly created directory. The bash script takes no arguments and expects the created `links.txt` file in the same directory, downloading all links found in the file. Finally, it cleans up the unwanted files (`links.txt` and downloader script iself), leaving a clean directory with downloaded files only.

## Setup

In `index.js`, update the global variables `parallelDownloads` and `downloadBasePath`:
- **parallelDownloads**: Defines how many links it'll concurrently fetch per batch;
- **downloadBasePath**: Base file path for the new release directory, where your `links.txt` file will end up at.

### Important note

When writing this tool, I originally intended to use PowerShell exclusively, but it didn't work quite well for `downloader` script. This let me to use a combination of PowerShell + WSL to execute respectively the JS code and the bash code. 

Extra tweaking will be necessary if running this script entirely from a unix machine, as in a few places of the JS code, paths are set expecting a windows machine. Simply search and replace usages for "\\" in paths.

Feel free to open a PR adding a PowerShell version of the download script.

## Usage

Once variables are setup, run:

```
$ npm start <folder-name> <qiwi.gg folder url>
Created links file: C:\Music\research\2023\2023-10-11\links.txt
Copied download script file to: C:\Music\research\2023\2023-10-11
```

Now, simply navigate to the created directory and run:
`./downloader.sh` 

The script concurrently downloads all files and save them to the working directory.
