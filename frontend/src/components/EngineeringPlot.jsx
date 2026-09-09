import Plotly from '../utils/chartRuntime'
import factory from 'react-plotly.js/factory'
import { chartTraces } from '../utils/resultExport'
const createPlot = factory.default || factory
const Plot = createPlot(Plotly)

export default function EngineeringPlot({ data, config, ...props }) {
  return <Plot {...props} data={chartTraces(data)} config={{ responsive: true, displaylogo: false, ...config }} />
}
