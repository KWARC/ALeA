// pages/acl/[aclId].tsx
import { Edit, Delete as DeleteIcon, PersonAdd, PersonRemove } from '@mui/icons-material';
import {
  Box,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  TextField,
  Tooltip,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Alert,
} from '@mui/material';
import {
  getAcl,
  getAclUserDetails,
  getAllAclMembers,
  isMember,
  isUserMember,
  deleteAcl,
  addRemoveMember,
  hasAclAssociatedResources, // IMPORT THE NEW FUNCTION HERE
} from '@stex-react/api';
import { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import AclDisplay from '../../components/AclDisplay';
import MainLayout from '../../layouts/MainLayout';

const AclId: NextPage = () => {
  const router = useRouter();
  const { query } = router;
  const aclId = query.aclId as string;

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [acls, setAcls] = useState<string[]>([]);
  const [directMembersNamesAndIds, setDirectMembersNamesAndIds] = useState<any[]>([]);
  const [desc, setDesc] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [updaterACLId, setUpdaterACLId] = useState<string | null>(null);
  const [userIsMember, setUserIsMember] = useState<boolean>(false);
  const [userIdInput, setUserIdInput] = useState<string>('');
  const [membershipStatus, setMembershipStatus] = useState<string>('');
  const [isUpdaterMember, setIsUpdaterMember] = useState<boolean>(false);
  const [allMemberNamesAndIds, setAllMemberNamesAndIds] = useState<any[]>([]);
  const [showAllMembers, setShowAllMembers] = useState<boolean>(false);

  // NEW STATE: To store if the ACL has associated resources
  const [hasAssociatedResources, setHasAssociatedResources] = useState<boolean>(false);


  const [memberToModifyId, setMemberToModifyId] = useState<string>('');
  const [addRemoveMemberError, setAddRemoveMemberError] = useState<string>('');
  const [addRemoveMemberSuccess, setAddRemoveMemberSuccess] = useState<string>('');


  const handleOpenDeleteDialog = () => {
    setDeleteError('');
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      if (aclId) {
        await deleteAcl(aclId);
        setDeleteDialogOpen(false);
        router.push('/acl');
      }
    } catch (e: any) {
      console.error("Error deleting ACL:", e);
      setDeleteError(e.response?.data?.message || 'Failed to delete ACL. It might be assigned to resources or have other dependencies.');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setDeleteError('');
  };

  async function getMembers() {
    try {
      const acl = await getAcl(aclId);
      setDesc(acl?.description);
      setUpdaterACLId(acl?.updaterACLId);
      setIsOpen(acl?.isOpen);
      const aclIds = new Set<string>();
      const aclUserDetails = await getAclUserDetails(aclId);
      acl.memberACLIds.forEach((m) => aclIds.add(m));
      setDirectMembersNamesAndIds(aclUserDetails);
      setAcls(Array.from(aclIds));
    } catch (e) {
      console.error("Error fetching ACL members:", e);
    }
  }

  async function getAllMembersOfAcl() {
    if (allMemberNamesAndIds.length === 0 || !showAllMembers) {
      try {
        const data: { fullName: string; userId: string }[] = await getAllAclMembers(aclId);
        setAllMemberNamesAndIds(data);
      } catch (e) {
        console.error("Error fetching all ACL members:", e);
      }
    }
    setShowAllMembers(!showAllMembers);
  }

  async function handleCheckUser() {
    try {
      const res: boolean = await isMember(aclId, userIdInput);
      setMembershipStatus(
        res
          ? `${userIdInput} is a member of this ACL.`
          : `${userIdInput} is not a member of this ACL.`
      );
    } catch (e) {
      console.error("Error checking user membership:", e);
      setMembershipStatus(`Error checking membership for ${userIdInput}.`);
    }
  }

  const handleAddRemoveMember = async (toBeAdded: boolean) => {
    setAddRemoveMemberError('');
    setAddRemoveMemberSuccess('');
    if (!memberToModifyId) {
      setAddRemoveMemberError('Please enter a User ID or ACL ID to add/remove.');
      return;
    }
    if (!aclId) {
      setAddRemoveMemberError('ACL ID is missing.');
      return;
    }

    try {
      const isAclMember = !memberToModifyId.includes('@');

      await addRemoveMember({
        memberId: memberToModifyId,
        aclId: aclId,
        isAclMember: isAclMember,
        toBeAdded: toBeAdded,
      });

      setAddRemoveMemberSuccess(`Successfully ${toBeAdded ? 'added' : 'removed'} ${memberToModifyId}.`);
      setMemberToModifyId('');
      getMembers();
      getAllMembersOfAcl();
    } catch (e: any) {
      console.error(`Error ${toBeAdded ? 'adding' : 'removing'} member:`, e);
      setAddRemoveMemberError(e.response?.data?.message || `Failed to ${toBeAdded ? 'add' : 'remove'} member.`);
    }
  };

  useEffect(() => {
    if (aclId) {
      getMembers(); // Fetches basic ACL data and updaterACLId

      const fetchStatusAndResources = async () => {
        try {
          const userMemberStatus = await isUserMember(aclId);
          setUserIsMember(userMemberStatus);
        } catch (error) {
          console.error("Error checking user membership:", error);
          setUserIsMember(false);
        }

        if (updaterACLId) {
          try {
            const updaterMemberStatus = await isUserMember(updaterACLId);
            setIsUpdaterMember(updaterMemberStatus);
          } catch (error) {
            console.error("Error checking updater membership:", error);
            setIsUpdaterMember(false);
          }
        } else {
            setIsUpdaterMember(false);
        }

        // NEW: Fetch resource association status
        try {
          const hasResources = await hasAclAssociatedResources(aclId);
          setHasAssociatedResources(hasResources);
        } catch (error) {
          console.error("Error fetching ACL resource association:", error);
          setHasAssociatedResources(false); // Default to false or handle as needed
        }
      };
      fetchStatusAndResources();
    }
    setShowAllMembers(false);
  }, [aclId, updaterACLId]); // Depend on aclId and updaterACLId for re-fetching

  return (
    <MainLayout>
      <Box
        sx={{
          m: '0 auto',
          maxWidth: '800px',
          p: '10px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <Box
          sx={{
            padding: '16px',
            margin: '16px 0',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <Typography variant="h4" color="primary" gutterBottom sx={{ flexShrink: 0 }}>
              {aclId}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <Tooltip
                title={
                  userIsMember ? 'You are a member of this ACL' : 'You are not a member of this ACL'
                }
              >
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: userIsMember ? 'green' : 'red',
                    flexShrink: 0,
                  }}
                ></Box>
              </Tooltip>
              {isUpdaterMember && (
                <>
                  <Button
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: '#203360',
                      color: '#ffffff',
                      '&:hover': {
                        backgroundColor: '#1a294d',
                      },
                      flexShrink: 0,
                    }}
                    variant="contained"
                    startIcon={<Edit />}
                    onClick={() => router.push(`/acl/edit/${aclId}`)}
                  >
                    Edit
                  </Button>

                  {/* MODIFIED: Conditionally render Delete button based on hasAssociatedResources */}
                  {!hasAssociatedResources && (
                    <Button
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: '#d32f2f',
                        color: '#ffffff',
                        '&:hover': {
                          backgroundColor: '#b00020',
                        },
                        flexShrink: 0,
                      }}
                      variant='contained'
                      startIcon={<DeleteIcon />}
                      onClick={handleOpenDeleteDialog}
                    >
                      Delete
                    </Button>
                  )}
                  {hasAssociatedResources && ( // Optionally, show a disabled button or tooltip for why it's hidden
                    <Tooltip title="Cannot delete: This ACL is associated with resources.">
                      <span> {/* Wrap for Tooltip on disabled button */}
                        <Button
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            backgroundColor: '#d32f2f',
                            color: '#ffffff',
                            '&:hover': {
                              backgroundColor: '#b00020',
                            },
                            flexShrink: 0,
                          }}
                          variant='contained'
                          startIcon={<DeleteIcon />}
                          disabled // Disable the button
                        >
                          Delete
                        </Button>
                      </span>
                    </Tooltip>
                  )}
                </>
              )}
            </Box>
          </Box>
          {desc && (
            <Typography variant="subtitle1" color="textSecondary" sx={{ mt: 2 }}>
              Description: {desc}
            </Typography>
          )}
          <Typography variant="subtitle1" color="textSecondary">
            Open: {isOpen ? 'Yes' : 'No'}
          </Typography>
          {updaterACLId && (
            <Typography variant="subtitle1" color="textSecondary">
              Updater:{' '}
              <Link href={`/acl/${updaterACLId}`} passHref>
                <Typography
                  variant="subtitle1"
                  color="secondary"
                  component="a"
                  sx={{
                    textDecoration: 'underline',
                    cursor: 'pointer',
                  }}
                >
                  <AclDisplay aclId={updaterACLId} />
                </Typography>
              </Link>
            </Typography>
          )}

          {/* Check Membership Section */}
          <Box sx={{ marginTop: '32px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <TextField
              label="User ID"
              variant="outlined"
              size="small"
              value={userIdInput}
              onChange={(e) => setUserIdInput(e.target.value)}
            />
            <Button variant="contained" color="primary" onClick={handleCheckUser}>
              Check Membership
            </Button>
          </Box>
          {membershipStatus && (
            <Typography sx={{ marginTop: '16px' }}>{membershipStatus}</Typography>
          )}

          {/* NEW SECTION: Add/Remove Members (Visible only if current user is an updater) */}
          {isUpdaterMember && (
            <Box sx={{ marginTop: '32px' }}>
              <Typography variant="h6" color="secondary" gutterBottom>
                Manage Members
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', mb: 2 }}>
                <TextField
                  label="Member User/ACL ID"
                  variant="outlined"
                  size="small"
                  value={memberToModifyId}
                  onChange={(e) => setMemberToModifyId(e.target.value)}
                  sx={{ minWidth: '200px' }}
                />
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<PersonAdd />}
                  onClick={() => handleAddRemoveMember(true)}
                >
                  Add Member
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<PersonRemove />}
                  onClick={() => handleAddRemoveMember(false)}
                >
                  Remove Member
                </Button>
              </Box>
              {addRemoveMemberSuccess && (
                <Alert severity='success' sx={{ mb: 2 }}>{addRemoveMemberSuccess}</Alert>
              )}
              {addRemoveMemberError && (
                <Alert severity='error' sx={{ mb: 2 }}>{addRemoveMemberError}</Alert>
              )}
            </Box>
          )}

          {/* Member ACLs List */}
          {acls.length !== 0 && (
            <Box sx={{ marginTop: '32px' }}>
              <Typography variant="h6" color="secondary" gutterBottom>
                Member ACLs
              </Typography>
              <List>
                {acls.map((aclIdItem, index) => (
                  <React.Fragment key={aclIdItem}>
                    <ListItem
                      component="a"
                      href={`/acl/${aclIdItem}`}
                      sx={{ '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}
                    >
                      <AclDisplay aclId={aclIdItem} />
                    </ListItem>
                    {index < acls.length - 1 && <Divider sx={{ width: '100%' }} />}
                  </React.Fragment>
                ))}
              </List>
            </Box>
          )}

          {/* Direct Members List */}
          {directMembersNamesAndIds.length !== 0 && (
            <Box sx={{ marginTop: '32px' }}>
              <Typography variant="h6" color="secondary" gutterBottom>
                Direct Members
              </Typography>
              <List>
                {directMembersNamesAndIds.map((user, index) => (
                  <React.Fragment key={user.userId}>
                    <ListItem
                      sx={{ '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}
                    >
                      <ListItemText
                        primary={
                          <>
                            {user.fullName === '' ? <i>unknown</i> : user.fullName} ({user.userId})
                          </>
                        }
                      />
                    </ListItem>
                    {index < directMembersNamesAndIds.length - 1 && <Divider sx={{ width: '100%' }} />}
                  </React.Fragment>
                ))}
              </List>
            </Box>
          )}

          {/* Toggle All Members Button */}
          <Button
            sx={{
              mt: '32px',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#203360',
              color: '#ffffff',
              '&:hover': {
                backgroundColor: '#1a294d',
              },
            }}
            variant="contained"
            onClick={getAllMembersOfAcl}
          >
            {showAllMembers ? 'Hide All Members' : 'Show All Members'}
          </Button>

          {/* All Members List (conditionally rendered) */}
          {allMemberNamesAndIds.length !== 0 && showAllMembers && (
            <Box sx={{ marginTop: '32px' }}>
              <Typography variant="h6" color="secondary" gutterBottom>
                All Members Of {aclId}
              </Typography>
              <List>
                {allMemberNamesAndIds.map((user, index) => (
                  <React.Fragment key={user.userId}>
                    <ListItem
                      sx={{ '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}
                    >
                      <ListItemText primary={`${user.fullName} (${user.userId})`} />
                    </ListItem>
                    {index < allMemberNamesAndIds.length - 1 && <Divider sx={{ width: '100%' }} />}
                  </React.Fragment>
                ))}
              </List>
            </Box>
          )}
        </Box>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="acl-delete-dialog-title"
        aria-describedby="acl-delete-dialog-description"
      >
        <DialogTitle id="acl-delete-dialog-title">Confirm ACL Deletion</DialogTitle>
        <DialogContent>
          {deleteError && (
            <Alert severity='error' sx={{ mb: 2 }}>{deleteError}</Alert>
          )}

          <DialogContentText id="acl-delete-dialog-description">
            Are you sure you want to delete ACL: **{aclId}**? This action cannot be undone.
            If this ACL is assigned to any resource or is a member of another ACL, deletion will be rejected by the server.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="secondary" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default AclId;
