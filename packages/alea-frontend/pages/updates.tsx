import { Box, Tooltip, Typography } from '@mui/material';
import { MdViewer } from '@alea/markdown';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { getLocaleObject } from '../lang/utils';
import MainLayout from '../layouts/MainLayout';
import { SYSTEM_UPDATES } from '../system-updates';

dayjs.extend(localizedFormat);

const UpdatesPage: NextPage = () => {
  const { locale } = useRouter();
  const { notification: t } = getLocaleObject({ locale });

  return (
    <MainLayout title="System Updates | ALeA">
      <Box p="10px" m="0 auto" maxWidth="650px">
        <Typography
          fontWeight="bold"
          textAlign="center"
          variant="h3"
          color="#444"
        >
          {t.systemUpdates}
        </Typography>
        {SYSTEM_UPDATES.map((update, idx) => (
          <Box key={idx} id={update.id} my="30px">
            <Typography fontWeight="bold" variant="h4" color="#444">
              {locale === 'de'
                ? update.header_de || update.header
                : update.header}
            </Typography>
            <Tooltip
              title={<span>{dayjs(update.postedTimestamp).format('LT')}</span>}
            >
              <Typography color="gray" mb="10px">
                {dayjs(update.postedTimestamp).format('LL')}
              </Typography>
            </Tooltip>
            <Typography>
              <Box
                sx={{ img: { maxWidth: '200px !important' } }}
                id={'image' + update.id}
              >
                <MdViewer
                  content={
                    locale === 'de'
                      ? update.content_de || update.content
                      : update.content
                  }
                />
              </Box>
            </Typography>
          </Box>
        ))}
      </Box>
    </MainLayout>
  );
};

export default UpdatesPage;
