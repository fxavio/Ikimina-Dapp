import Head from 'next/head';
import IkiminaComponent from '../components/ikimina';

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f4f8 0%, #d9e7fa 100%)',
      padding: '40px 0'
    }}>
      <Head>
        <title>SmartSave</title>
        <meta name="description" content="Ikimina Group Savings DApp" />
      </Head>

      <main style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff',
        borderRadius: '16px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: '32px 24px',
        maxWidth: '480px',
        margin: '0 auto'
      }}>
        <h1 style={{ fontWeight: 700, fontSize: '2rem', marginBottom: '16px', color: '#2d3748' }}>
          Amali SmartSave
        </h1>
        {/* <p style={{ color: '#4a5568', marginBottom: '24px' }}>
          Ikimina Group Savings DApp
        </p> */}
        <IkiminaComponent />
      </main>
    </div>
  );
}