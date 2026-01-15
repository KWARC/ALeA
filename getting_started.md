# Getting Started with ALeA

This guide walks you through setting up and running the **ALeA** project, which includes:
- **alea-frontend** (Next.js frontend)

## Prerequisites  
Ensure you have the following installed on your system before proceeding:
- **Node.js** (Recommended: `LTS`) – [Download](https://nodejs.org/)
- **npm** (Recommended: `latest`) – `npm install -g npm@latest`
- **Git** – [Download](https://git-scm.com/)
- **MySQL** & **MySQL Workbench** – [Download](https://dev.mysql.com/downloads/)
- **nx** - `npm install -g nx`

## Installation  

1. **Clone the Repository**  
   ```sh
   git clone https://github.com/slatex/ALeA.git
   cd ALeA
   ```

2. **Install Dependencies**  
   ```sh
   npm install
   ```

## Database Setup

1. **Check for SQL Setup Files**
   - Navigate to the project folder and locate the `comments_database_setup` directory.
   - Inside, you will find SQL scripts for setting up the database.

2. **Run SQL Scripts**
   - Open MySQL Workbench.
   - Execute the SQL queries from the `comments_database_setup` folder to create the necessary database and tables.

## Running the Applications  

### alea-frontend (Next.js)  

#### Local Development  
```sh
npm run start alea-frontend
```
- Runs on `http://localhost:4200`  



   
## Access Control List (ACL) Setup

This guide provides step-by-step instructions to create and configure an Access Control List (ACL) in the system.

### Step 1: Run Initial SQL Setup

Execute the SQL queries from the `intialSqlSetup.sql` file to set up the sys-admin ACL, initial course metadata, and other required data.

### Step 2: Insert into `ResourceAccess`

Run the following SQL query to add resource access control:

   ```INSERT INTO ResourceAccess (resourceId, actionId, aclId) VALUES ('/**', 'ACCESS_CONTROL', 'sys-admin');```

### Step 3: Assign Resource-Action Permissions

1. Navigate to the **exp** page in the application.
2. Locate and click on the **system-administrator** button.
3. Follow the prompts to create a resource-action assignment by specifying the desired resources and actions that the `sys-admin` role should control.
4. Save the changes.

## Fake User Login

1. *Login Flow*  
   - User clicks on the *Login* button when getting started.
   - A warning message appears, and the user must click on the *warning* word.
   - The user then enters a 3-letter word (e.g., abc, xyz).
   - The system automatically creates a fake user with the username fake_abc or fake_xyz.  

## Job Portal ACL for Students

- An open ACL `job-portal-students` for all FAU students registering on the Job Portal.
- Anyone with a valid FAU ID can join this ACL.

#### Database Entry

```sql
INSERT INTO AccessControlList (id, description, updaterACLId, isOpen)
VALUES (
  'job-portal-students',
  'students enrolled in job portal',
  'sys-admin',
  1
);
```

## env.local

Create a .env.local file inside the packages/alea-frontend directory with the following content:

`packages/alea-frontend/.env.local`

```
NEXT_PUBLIC_FLAMS_URL=https://mathhub.info
NEXT_PUBLIC_AUTH_SERVER_URL=https://lms.voll-ki.fau.de
NEXT_PUBLIC_LMP_URL=https://lms.voll-ki.fau.de
NEXT_PUBLIC_GPT_URL=http://127.0.0.1:5000
NEXT_PUBLIC_SITE_VERSION=development

#For database connection, update as required
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your-password
MYSQL_COMMENTS_DATABASE=comments_test
```



## Set Up Environment Variables for Prebuild Scripts (Optional)

Create a .env.local file inside the prebuild-scripts directory with the following content:

` prebuild-scripts/.env.local`
```
BLOG_INFO_FILE=./blogData.json
BLOG_INFO_DIR=./static
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your-password
MYSQL_COMMENTS_DATABASE=comments_test
```
