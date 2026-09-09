export default function ScenarioSource({ source }) {
  if (!source) return null
  return <section aria-label="Scenario source" className="border p-4 text-sm">
    <p>Starting point: {source.label}. {source.source}.</p>
    <p>Inputs remain editable. This starting point does not establish model validation.</p>
    {source.ignored_fields?.length > 0 && <p>Fields not applied: {source.ignored_fields.join(', ')}. Other fields use page defaults.</p>}
  </section>
}
