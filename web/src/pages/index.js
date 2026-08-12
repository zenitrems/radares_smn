import Head from "next/head";
import Consola from "../components/Consola";
import { leerCatalogo } from "../lib/catalogo";

/* Los GIF se renuevan cada pocos minutos, así que el catálogo se lee por petición. */
export async function getServerSideProps() {
  return { props: { catalogo: leerCatalogo() } };
}

export default function Home({ catalogo }) {
  return (
    <>
      <Head>
        <title>Sondeos Radar — Península de Yucatán</title>
        <meta
          name="description"
          content="Consola de sondeos de radar del SMN para la Península de Yucatán"
        />
      </Head>
      <Consola catalogo={catalogo} />
    </>
  );
}
