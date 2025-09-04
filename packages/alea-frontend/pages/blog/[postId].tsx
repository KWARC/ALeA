import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import { BlogPost, canAccessResource, deleteBlogPost, getPostById } from '@stex-react/spec';
import fs from 'fs';
import { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { MystViewer } from '@stex-react/myst';
import { Action, getResourceId, ResourceName } from '@stex-react/utils';

const BlogPostPage: NextPage = ({ post }: { post: BlogPost }) => {
  const router = useRouter();
  const postId = router.query.postId;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [blogPost, setBlogPost] = useState<BlogPost>(post);
  const [canEditOrDelete, setCanEditOrDelete] = useState<boolean>(false);

  useEffect(() => {
    async function fetchBlog() {
      try {
        const blogData = await getPostById(postId as string);
        setBlogPost(blogData);
      } catch (error) {
        alert('the page you are looking for is not available');
        router.push('/blog');
      }
    }
    if (router.isReady && postId) {
      fetchBlog();
    }
  }, [router.isReady, postId, router]);

  useEffect(() => {
    async function checkIsUserCanDeleteOrEdit() {
      if (await canAccessResource(ResourceName.BLOG, Action.MUTATE)) {
        setCanEditOrDelete(true);
      }
    }
    checkIsUserCanDeleteOrEdit();
  }, []);

  const toggleDeleteDialogOpen = () => {
    setDeleteDialogOpen((prevState) => !prevState);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteBlogPost(postId as string);
      alert('Post deleted successfully');
      router.push('/blog');
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Error deleting post');
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  if (router.isFallback || !blogPost || !postId) {
    return <>loading...</>;
  }

  return (
    <MainLayout>
      <Box mx="10px">
        <Box m="0 auto" maxWidth="800px">
          <Box display="flex" justifyContent="space-between" m="20px">
            <Link href="/blog">
              <Button variant="contained">All Posts</Button>
            </Link>
            {canEditOrDelete && (
              <Box display="flex" gap="10px">
                <Link href={`/blog/edit?postId=${blogPost.postId}`}>
                  <IconButton>
                    <EditIcon />
                  </IconButton>
                </Link>
                <IconButton onClick={toggleDeleteDialogOpen}>
                  <DeleteIcon color="warning" />
                </IconButton>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              p: '20px',
              m: '20px',
              minHeight: 'calc(100vh - 270px)',
              boxShadow: '0 0 10px 0 gray',
              borderRadius: '5px',
            }}
          >
            <MystViewer content={blogPost.title} />
            <hr />
            {blogPost.heroImageUrl && (
              <img
                src={blogPost.heroImageUrl}
                height={300}
                width="100%"
                style={{ objectFit: 'cover' }}
                alt="post_banner"
              />
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ display: 'flex', alignItems: 'center' }}>
                <MystViewer content={blogPost.authorName} />
              </Typography>
              <Typography fontWeight="bold">
                <MystViewer content={blogPost.createdAt.split('T')[0]} />
              </Typography>
            </Box>
            <MystViewer content={blogPost.body} />
          </Box>
        </Box>
      </Box>
      <Dialog open={deleteDialogOpen} onClose={toggleDeleteDialogOpen}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete this post?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={toggleDeleteDialogOpen}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="warning">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default BlogPostPage;

export async function getStaticPaths() {
  if (!fs.existsSync('../../static/blogData.json')) {
    return { paths: [], fallback: true };
  }
  const data = fs.readFileSync('../../static/blogData.json', 'utf-8');
  const jsonData = JSON.parse(data);
  const paths = jsonData.map((blog: BlogPost) => ({
    params: { postId: blog.postId },
  }));
  return { paths, fallback: true };
}

export async function getStaticProps({ params }: { params: { postId: string } }) {
  try {
    const data = fs.readFileSync('../../static/blogData.json', 'utf-8');
    const jsonData = JSON.parse(data);
    const post = jsonData.find((blog: BlogPost) => blog.postId === params.postId);
    if (!post) {
      return { props: { post: null } };
    }
    return { props: { post } };
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return { props: { post: null } };
  }
}
