import { Box, Button, Typography } from '@mui/material';
import { BlogPost, canAccessResource, getPostSnippets, PostSnippet } from '@alea/spec';
import { MdViewer } from '@alea/markdown';
import { Action, ResourceName } from '@alea/utils';
import fs from 'fs';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';

const BlogHomePage: NextPage = ({ postSnippets }: { postSnippets: PostSnippet[] }) => {
  const router = useRouter();
  const [snippets, setSnippets] = useState<PostSnippet[]>(postSnippets);
  const [canCreate, setCanCreate] = useState<boolean>(false);

  useEffect(() => {
    canAccessResource(ResourceName.BLOG, Action.MUTATE).then(setCanCreate);
  }, []);

  useEffect(() => {
    async function fetchPost() {
      const data = await getPostSnippets();
      setSnippets(data);
    }
    if (router.isReady) fetchPost();
  }, [router.isReady]);
  return (
    <MainLayout>
      <Box mx="10px">
        <Box m="0 auto" maxWidth="800px">
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Typography
              m="20px"
              variant="h3"
              fontFamily={'"Roboto", "Helvetica", "Arial", sans-serif'}
            >
              ALeA Blog
            </Typography>
            {canCreate && (
              <Button onClick={() => router.push('/blog/new')} variant="contained">
                Create new post
              </Button>
            )}
          </Box>
          {snippets.map((snippet) => (
            <Box
              key={snippet.postId}
              border="1px solid #CCC"
              p="20px"
              m="20px"
              onClick={() => router.push(`/blog/${snippet.postId}`)}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                borderRadius: '10px',
                boxShadow: '0px 0px 10px #CCC',
                transition: 'transform 0.3s ease-in-out',
                '&:hover': {
                  transform: 'scale(1.03)',
                },
              }}
            >
              <img
                src={snippet.heroImageUrl}
                alt="hero image"
                height="300px"
                width="100%"
                style={{ objectFit: 'cover', objectPosition: snippet.heroImagePosition }}
              />
              <MdViewer content={snippet.title} />
              <Box
                display="flex"
                flexDirection={'row'}
                justifyContent="space-between"
                alignItems="center"
                height="20px"
                width="100%"
              >
                <Typography fontSize={12} textAlign={'right'}>
                  {snippet.createdAt.split('T')[0]}
                </Typography>
                <Typography display="flex" alignItems="center">
                  Author: <MdViewer content={snippet.authorName} />
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </MainLayout>
  );
};

export default BlogHomePage;

function convertToPostSnippets(blogData: BlogPost[]): PostSnippet[] {
  return blogData.map((snippet) => {
    return {
      postId: snippet.postId,
      title: snippet.title,
      authorName: snippet.authorName,
      createdAt: snippet.createdAt,
      heroImageUrl: snippet.heroImageUrl,
      heroImagePosition: snippet.heroImagePosition,
    };
  });
}

export async function getStaticProps() {
  if (!fs.existsSync('../../static/blogData.json')) {
    return { props: { postSnippets: [] } };
  }
  const data = fs.readFileSync('../../static/blogData.json', 'utf8');
  const jsonData = JSON.parse(data);
  const postSnippets = convertToPostSnippets(jsonData);
  return {
    props: {
      postSnippets,
    },
  };
}
