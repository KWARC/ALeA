import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { Box, CircularProgress, Tooltip, tooltipClasses, Typography } from '@mui/material';
import { getAcl, getAclUserDetails } from '@stex-react/spec';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
interface AclDetails {
  isOpen: boolean;
  description: string;
  updaterACLId: string;
  memberAcls: string[];
}

function AclHoverPopup({ aclId }: { aclId: string }) {
  const [aclDetails, setAclDetails] = useState<AclDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [directMembersNamesAndIds, setDirectMembersNamesAndIds] = useState<
    { fullName: string; userId: string }[]
  >([]);

  useEffect(() => {
    async function fetchAclDetails() {
      const acl = await getAcl(aclId as string);
      setLoading(true);
      setAclDetails({
        isOpen: acl.isOpen,
        description: acl.description,
        updaterACLId: acl.updaterACLId,
        memberAcls: acl.memberACLIds || [],
      });
      const userDetails = await getAclUserDetails(aclId);
      setDirectMembersNamesAndIds(userDetails);
      setLoading(false);
    }
    fetchAclDetails();
  }, [aclId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={16} />
      </Box>
    );
  }
  return (
    <Box
      maxWidth="600px"
      color="black"
      border="1px solid #CCC"
      p="8px"
      borderRadius="5px"
      boxShadow="1px 4px 10px 4px rgba(0,0,0,0.33)"
    >
      <Box display={'flex'}>
        <Typography variant="subtitle1" color="primary">
          {aclId}
        </Typography>
        {aclDetails.isOpen ? (
          <LockOpenIcon sx={{ ml: 1, color: 'green' }} />
        ) : (
          <LockIcon sx={{ ml: 1, color: 'red' }} />
        )}
      </Box>
      {aclDetails.updaterACLId && (
        <Box>
          <Typography variant="body2" color="secondary">
            Updater ACL:
            <AclDisplay aclId={aclDetails.updaterACLId} />
          </Typography>
        </Box>
      )}
      {directMembersNamesAndIds.length > 0 && (
        <Box>
          <Typography color="secondary">Direct Members:</Typography>
          {directMembersNamesAndIds.map((member) => (
            <Typography fontSize={14} key={member.userId}>
              {member.fullName == '' ? <i>unknown</i> : member.fullName} ({member.userId})
            </Typography>
          ))}
        </Box>
      )}
      {aclDetails.memberAcls.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="secondary">
            MembersAcls:
          </Typography>
          {aclDetails.memberAcls.map((member) => (
            <AclDisplay key={member} aclId={member} />
          ))}
        </Box>
      )}
    </Box>
  );
}

function AclDisplay({ aclId }: { aclId: string }) {
  const router = useRouter();
  return (
    <Tooltip
      title={<AclHoverPopup aclId={aclId} />}
      placement="right"
      leaveDelay={300}
      PopperProps={{
        modifiers: [
          {
            name: 'offset',
            options: {
              offset: [0, -10],
            },
          },
        ],
        sx: {
          [`& .${tooltipClasses.tooltip}`]: {
            maxWidth: 'none',
            margin: '0',
            padding: '0',
            backgroundColor: 'white',
          },
        },
      }}
    >
      <Typography
        variant="body2"
        color="textPrimary"
        sx={{
          margin: '3px',
          display: 'inline-block',
          padding: '4px 8px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.875rem',
          ':hover': {
            backgroundColor: '#f5f5f5',
          },
        }}
        onClick={(e) => router.push(`/acl/${aclId}`)}
      >
        {aclId}
      </Typography>
    </Tooltip>
  );
}

export default AclDisplay;
