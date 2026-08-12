pipeline {
    agent any

    stages {

        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('Verify Environment') {
            steps {
                sh '''
                pwd
                ls -la
                git --version
                node -v
                npm -v
                '''
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Build Next.js') {
            steps {
                sh 'npm run build'
            }
        }

        

        stage('Deploy to Frontend') {
            steps {
                sh '''
                ssh -o StrictHostKeyChecking=no ubuntu@172.31.3.166 << 'EOF'
                cd /var/www/Gcompro
                git pull origin main
                npm install
                npm run build
                pkill -f ".next/standalone/server.js" || true
                nohup npm start > app.log 2>&1 &
                exit
EOF
                '''
            }
        }

    }

    post {
        success {
            echo '✅ Frontend Build Successful'
        }

        failure {
            echo '❌ Frontend Build Failed'
        }
    }
}
