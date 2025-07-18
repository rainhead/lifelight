import Style from 'ol/style/Style';
import { Circle, Fill, Stroke } from 'ol/style.js';

const fill = new Fill({color: 'rgba(255, 255, 255, 0.4)'});
const stroke = new Stroke({color: '#3399CC'})
export const observationStyle = new Style({
  image: new Circle({radius: 3, stroke, fill}),
  fill,
  stroke,
});
