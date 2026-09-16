import { checkIdmEmailMappingCoverage } from '../../../nodejs-scripts/src/checkIdmEmailMappingCoverage';

checkIdmEmailMappingCoverage().catch((err) => {
  console.error(err);
  process.exit(1);
});
