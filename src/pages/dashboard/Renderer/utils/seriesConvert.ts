import _ from 'lodash';
import moment from 'moment';

export function convertTimeseriesToG2Data(series) {
  console.log(series,66444)
  const data: any[] = [];
  if(Array.isArray(series)){
    series?.map((serie: { name: any; data: any[]; metric: any; }) => {
      const name = serie.name;
      if(serie[0]?.data){
        console.log(333)
        serie[0].data.map((v) => {
          data.push({
            ...serie.metric,
            name: name,
            time: v[0] * 1000,
            value: _.toNumber(v[1]),
            metric: serie.metric
          });
        });
      }else {
        console.log(444)
        serie.data.map((v) => {
          data.push({
            ...serie.metric,
            name: name,
            time: v[0] * 1000,
            value: _.toNumber(v[1]),
            metric: serie.metric
          });
        });
      }
    
    });
  }else {
    series?.series?.map((serie: { name: any; data: any[]; metric: any; }) => {
      const name = serie.name;
      serie.data.map((v) => {
        data.push({
          ...serie.metric,
          name: name,
          time: v[0] * 1000,
          value: _.toNumber(v[1]),
          metric: serie.metric
        });
      });
    });
  }

  return data;
}
