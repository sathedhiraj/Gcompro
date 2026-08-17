pipeline {
    agent any

    environment {
        DOCKER_IMAGE = "dhirajsathe20/gcompro"
    }

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
                docker --version
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

        stage('Build Docker Image') {
            steps {
                sh '''
                echo "Building Docker Image..."

                docker build \
                    -t ${DOCKER_IMAGE}:${BUILD_NUMBER} \
                    -t ${DOCKER_IMAGE}:latest \
                    .
                '''
            }
        }

        stage('Push Docker Image to Docker Hub') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'docker-credential',
                        usernameVariable: 'DOCKER_USERNAME',
                        passwordVariable: 'DOCKER_PASSWORD'
                    )
                ]) {

                    sh '''
                    echo "$DOCKER_PASSWORD" | docker login \
                        -u "$DOCKER_USERNAME" \
                        --password-stdin

                    docker push ${DOCKER_IMAGE}:${BUILD_NUMBER}
                    docker push ${DOCKER_IMAGE}:latest

                    docker logout
                    '''
                }
            }
        }

        stage('Deploy to Frontend') {
            steps {
                sh '''
                ssh -o StrictHostKeyChecking=no ubuntu@172.31.5.235 << 'EOF'

                cd /var/www/gcompro

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
            echo '✅ Frontend Build + Docker Image Push Successful'
        }

        failure {
            echo '❌ Frontend Build / Docker Push / Deployment Failed'
        }

    }
}
