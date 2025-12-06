import { useState, useEffect } from 'react';
import { getUriWeights } from '@alea/spec';
import { CompetencyTable } from '@alea/stex-react-renderer';

const LearnerCompetencyData = ({ URIs }: { URIs: string[] }) => {
  const [competencyData, setCompetencyData] = useState(null);
  useEffect(() => {
    async function getData() {
      const data = await getUriWeights(URIs);
      setCompetencyData(data);
    }
    getData();
  }, [URIs]);
  return <CompetencyTable conceptUris={URIs} competencyData={competencyData} />;
};

export default LearnerCompetencyData;
