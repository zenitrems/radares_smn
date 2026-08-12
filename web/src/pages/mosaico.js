import Head from "next/head";
import ConsolaMosaico from "../components/ConsolaMosaico";
import { leerCatalogo } from "../lib/catalogo";

export async function getServerSideProps() {
  return { props: { catalogo: leerCatalogo() } };
}

export default function Mosaico({ catalogo }) {
  return (
    <>
      <Head>
        <title>Mosaico 450 km — Sondeos Radar</title>
        <meta
          name="description"
          content="Sondeos de 450 km de Sabancuy y Cancún combinados en un solo mapa"
        />
      </Head>
      <ConsolaMosaico catalogo={catalogo} />
    </>
  );
}
