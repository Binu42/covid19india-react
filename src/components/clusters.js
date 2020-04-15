import axios from 'axios';
import * as d3 from 'd3';
import ForceGraph2D from 'react-force-graph-2d';
import React, {useEffect, useRef, useState} from 'react';

function Clusters({stateCode}) {
  const [fetched, setFetched] = useState(false);
  const [stateRawData, setStateRawData] = useState([]);
  const [networkData, setNetworkData] = useState([]);

  function prepareNetworkData(data) {
    // Parse data
    let contractedStr = data.reduce(
      (acc, v) => acc + v.contractedfromwhichpatientsuspected + ', ',
      ''
    );
    contractedStr = contractedStr.replace(/\s+/g, '');
    const sources = new Set(contractedStr.match(/[^,]+/g));

    // Prepare nodes and links
    const nodes = [];
    const nodesSet = new Set();
    const links = [];
    data.forEach((d) => {
      const contractedStr = d.contractedfromwhichpatientsuspected.replace(
        /\s+/g,
        ''
      );
      const contracted = contractedStr.match(/[^,]+/g);
      if (contracted) {
        const pid = 'P' + d.patientnumber;
        nodesSet.add(pid);
        nodes.push({
          id: pid,
          group: sources.has(pid) ? 'source' : 'target',
          raw: d,
        });
        contracted.forEach((p) => {
          links.push({
            source: p,
            target: pid,
          });
        });
      }
    });

    // Add missing nodes
    links.forEach((d) => {
      if (!nodesSet.has(d.source)) {
        nodes.push({
          id: d.source,
          group: 'source',
          raw: d.source,
        });
        nodesSet.add(d.source);
      }
    });
    return {
      nodes: nodes,
      links: links,
    };
  }

  useEffect(() => {
    async function getData() {
      try {
        const rawDataResponse = await axios.get(
          'https://api.covid19india.org/raw_data.json'
        );
        setStateRawData(
          rawDataResponse.data.raw_data.filter((d) => d.statecode === stateCode)
        );
        setFetched(true);
      } catch (err) {
        console.log(err);
      }
    }
    if (!fetched) {
      getData();
    }
  }, [fetched, stateCode]);

  useEffect(() => {
    setNetworkData(prepareNetworkData(stateRawData));
  }, [stateRawData]);

  const NetworkGraph = () => {
    const fgRef = useRef();
    const width = document.getElementById('clusters').offsetWidth;
    const height = width;

    useEffect(() => {
      const fg = fgRef.current;
      // Deactivate existing forces
      fg.d3Force('charge').strength(-50);
      fg.d3Force('collision', d3.forceCollide());
      fg.d3Force('x', d3.forceX().strength(0.2));
      fg.d3Force('y', d3.forceY().strength(0.2));

      // Custom force to keep everything inside box
      // function boxForce() {
      //   for (let i = 0, n = nodes.length; i < n; ++i) {
      //     const currNode = nodes[i];
      //     currNode.x = Math.max(
      //       -width / 2 + radius,
      //       Math.min(width / 2 - radius, currNode.x)
      //     );
      //     currNode.y = Math.max(
      //       -height / 2 + radius,
      //       Math.min(height / 2 - radius, currNode.y)
      //     );
      //   }
      // }
    }, []);

    return (
      <ForceGraph2D
        ref={fgRef}
        width={width}
        height={height}
        graphData={networkData}
        nodeLabel="id"
        nodeAutoColorBy="group"
        linkDirectionalParticleColor={() => 'red'}
        linkDirectionalParticles={1}
        linkDirectionalParticleWidth={(link) =>
          link.source.id[0] === 'P' ? 2 : 0
        }
      />
    );
  };

  return <div id="clusters">{fetched ? <NetworkGraph /> : ''}</div>;
}

export default Clusters;