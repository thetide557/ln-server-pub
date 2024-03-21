export interface assetsType {
    id: number;
    ident: string;
    group_id: number;
    name: string;
    address: string;
    port: number;
    type: string;
    target: string;
    memo: string;
    optional_metrics: string;
    configs: string;
    dashboard?: string;
}
export const  metricsUnitEnum={
    "percent": 'percent%',
    "percentUnit":'percent0~1',
    "seconds":'秒',
    "milliseconds":'毫秒',
    "seconds_100ms":"分秒",
    "bitsSI":'比特值1',
    "bytesSI":'比特值2',
    "bitsIEC":'比特值3',    
    "bytesIEC":'比特值4',
};