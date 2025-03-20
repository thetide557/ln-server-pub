import moment from 'moment';
export function timestamp(data) {
    return Math.round(new Date(data).getTime() / 1000)
}

export function timestampToCST(timestamp) {
    let tampLength = timestamp.toString().length;
    let date = new Date(tampLength == 13 ? timestamp : timestamp * 1000);
    let Y = date.getFullYear() + '-';
    let M = (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + '-';
    let D = date.getDate() + ' ';
    // h = date.getHours() + ':';
    // m = date.getMinutes() + ':';
    // s = date.getSeconds();
    return Y + M + D;
}

export function isSameDay(timestamp1, timestamp2) {
    const date1 = new Date(timestamp1);
    const date2 = new Date(timestamp2);

    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}
 
export function getPreviousWeekTimestamp(timestamp) {
    const date = new Date(timestamp);
    date.setDate(date.getDate() - 7);
    return date.getTime();
}