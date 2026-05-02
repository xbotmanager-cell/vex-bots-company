/**
 * VEX CORE: YOUTUBE DOWNLOADER LIBRARY
 * Optimized for Render Free Tier (Low RAM Usage)
 * Dev: Lupin Starnley
 */

const ytdl = require('ytdl-core');
const axios = require('axios');

/**
 * Downloads Video Metadata and Link
 * @param {string} url - YouTube Video URL
 * @param {string} quality - Resolution (e.g., '720p', '480p')
 */
async function ytv(url, quality = '720p') {
    return new Promise(async (resolve, reject) => {
        try {
            const info = await ytdl.getInfo(url);
            
            // Filters for video + audio combined to avoid complex merging (saves RAM)
            const format = ytdl.chooseFormat(info.formats, { 
                quality: 'highestvideo', 
                filter: 'audioandvideo' 
            });

            if (!format) throw new Error("No suitable format found");

            resolve({
                title: info.videoDetails.title,
                thumb: info.videoDetails.thumbnails[0].url,
                channel: info.videoDetails.author.name,
                views: info.videoDetails.viewCount,
                dl_link: format.url,
                extension: 'mp4'
            });
        } catch (error) {
            // Backup API if ytdl-core fails (Redundancy)
            try {
                const { data } = await axios.get(`https://api.vyturex.com/yt-download?url=${url}`);
                resolve({
                    title: data.title,
                    dl_link: data.video_url,
                    extension: 'mp4'
                });
            } catch (err) {
                reject(err);
            }
        }
    });
}

/**
 * Downloads Audio Metadata and Link (Bonus for VEX)
 * @param {string} url - YouTube URL
 */
async function yta(url) {
    return new Promise(async (resolve, reject) => {
        try {
            const info = await ytdl.getInfo(url);
            const format = ytdl.chooseFormat(info.formats, { filter: 'audioonly' });
            
            resolve({
                title: info.videoDetails.title,
                thumb: info.videoDetails.thumbnails[0].url,
                dl_link: format.url,
                extension: 'mp3'
            });
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = { ytv, yta };
