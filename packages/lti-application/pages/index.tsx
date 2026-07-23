const baseUrl =
  process.env.NEXT_PUBLIC_LTI_TOOL_BASE_URL ?? 'http://localhost:4200';

const urls = [
  ['OIDC login URL', `${baseUrl}/api/lti/login`],
  ['Launch redirect URL', `${baseUrl}/api/lti/launch`],
  ['JWKS URL', `${baseUrl}/api/lti/jwks`],
  ['Target link URI', baseUrl],
];

export default function Index() {
  return (
    <main>
      <h1>Hello LTI Tool</h1>
      <p>Register these URLs in Saltire:</p>
      <ul>
        {urls.map(([label, value]) => (
          <li key={label}>
            {label}: <code>{value}</code>
          </li>
        ))}
      </ul>
    </main>
  );
}
