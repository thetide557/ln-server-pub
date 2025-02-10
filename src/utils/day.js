import moment from 'moment';
export function timestamp(data) {
    return Math.round(new Date(data).getTime() / 1000)
}



export function timestampToCST(timestamp) {
    let date = new Date(timestamp * 1000);
    let Y = date.getFullYear() + '-';
    let M = (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + '-';
    let D = date.getDate() + ' ';
    // h = date.getHours() + ':';
    // m = date.getMinutes() + ':';
    // s = date.getSeconds();
    return Y + M + D;
}