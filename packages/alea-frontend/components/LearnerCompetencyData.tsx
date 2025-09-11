import { useState, useEffect } from 'react';
import { getUriWeights } from '@stex-react/spec';
import { CompetencyTable } from '@stex-react/stex-react-renderer';

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
