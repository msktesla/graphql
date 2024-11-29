const GET_USER_SKILLS = `
    query GetUserSkills($userId: Int!) {
        user_skills(where: { user_id: { _eq: $userId }}) {
            skill_id
            skill {
                name
                category
                level
                parent_skill_id
            }
            progress
            xp_earned
            completed
            projects {
                name
                status
            }
        }
        skill_categories {
            name
            total_xp
            progress
        }
    }
`;

class DashboardController {
    constructor() {
        this.data = null;
        this.currentView = 'overview';
        this.charts = {};
        
        // Initialize effects after ensuring canvas elements exist
        requestAnimationFrame(() => {
            this.matrixEffect = new MatrixEffect();
            this.christmasEffect = new ChristmasEffect();
            this.initializeEffectControls();
        });
        
        this.initializeEventListeners();
        // this.renderAuditPanels();  // Comment out this line
    }

    async initialize() {
        try {
            // Add token check at the start
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.replace('./login.html');
                return;
            }

            // Continue with existing working code
            this.showLoading('overview-panel');
            const user = await AuthService.getCurrentUser();
            
            if (!user) {
                throw new Error('User data not found');
            }

            // Fetch all profile data in one query
            const profileData = await APIService.graphqlRequest(GET_USER_PROFILE, {
                userId: parseInt(user.id)
            });

            console.log('Fetched Profile Data:', profileData);

            // Store data
            this.data = {
                user,
                profile: profileData?.user_public_view?.[0],
                totalXP: profileData?.transaction_aggregate?.aggregate?.sum?.amount || 0,
                completedProjects: profileData?.progress?.length || 0,
                xpTransactions: profileData?.transaction || [],
                progress: profileData?.progress || []
            };

            // Update UI
            await this.updateUserProfile();
            this.hideLoading('overview-panel');
            
            // Ensure DOM is ready before rendering
            requestAnimationFrame(() => {
                this.renderView('overview').then(() => {
                    // Force a small delay to ensure container is ready
                    setTimeout(() => {
                        this.renderActivityHeatmap();
                    }, 100);
                });
            });
        } catch (error) {
            console.error('Initialization error:', error);
            if (error.message.includes('token')) {
                window.location.replace('./login.html');
            } else {
                this.showError(error.message);
            }
        }
    }

    async updateUserProfile() {
        try {
            const profile = this.data.profile;
            const user = this.data.user;
            if (!profile || !user) return;

            const profileSection = document.querySelector('.user-profile');
            if (profileSection) {
                const fullName = profile.firstName && profile.lastName 
                    ? `${profile.firstName} ${profile.lastName}`
                    : profile.login;

                profileSection.innerHTML = `
                    <div class="avatar">
                        <img 
                            src="./images/logos/01icon_400x400.png" 
                            alt="User Avatar"
                            onerror="this.onerror=null; this.src='./images/logos/01icon_400x400.png';"
                        >
                    </div>
                    <h2 id="user-name">${fullName}</h2>
                    <p class="user-login">@${profile.login}</p>
                    <p class="user-id">ID: ${user.id}</p>
                `;
            }
        } catch (error) {
            console.error('Error updating user profile:', error);
            this.handleError(error, 'profile update');
        }
    }

    getNextRankLevel(currentLevel) {
        const rankLevels = [10, 20, 30, 40, 50];
        return rankLevels.find(level => level > currentLevel) || 50;
    }

    showLoading() {
        const elements = ['total-xp', 'current-level', 'projects-completed'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = 'Loading...';
                element.classList.add('loading');
            }
        });
    }

    hideLoading() {
        const elements = document.querySelectorAll('.loading');
        elements.forEach(element => {
            element.classList.remove('loading');
        });
    }

    showError(message) {
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.style.display = 'block';
        }
    }

    initializeEventListeners() {
        // Remove any existing tooltips first
        document.querySelectorAll('.pill-tooltip').forEach(tooltip => {
            if (tooltip.parentElement.querySelector('.pill-tooltip:not(:first-child)')) {
                tooltip.remove();
            }
        });

        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', async () => {
                const view = item.dataset.view;
                if (view && view !== 'audits') {
                    await this.renderView(view);
                }
            });
        });

        document.getElementById('logout-button').addEventListener('click', () => {
            AuthService.logout();
        });

        document.querySelector('[data-view="skills"]')?.addEventListener('click', async () => {
            await this.renderView('skills');
        });
    }

    initializeMatrixControls() {
        document.getElementById('red-pill').addEventListener('click', () => {
            if (this.christmasEffect.isActive) this.christmasEffect.toggle();
            this.matrixEffect.toggle();
        });
        
        document.getElementById('blue-pill').addEventListener('click', () => {
            if (this.matrixEffect.isActive) this.matrixEffect.toggle();
            if (this.christmasEffect.isActive) this.christmasEffect.toggle();
        });

        document.getElementById('christmas-pill').addEventListener('click', () => {
            if (this.matrixEffect.isActive) this.matrixEffect.toggle();
            this.christmasEffect.toggle();
        });
    }

    initializeEffectControls() {
        document.getElementById('red-pill').addEventListener('click', () => {
            if (this.christmasEffect.isActive) this.christmasEffect.toggle();
            this.matrixEffect.toggle();
        });
        
        document.getElementById('blue-pill').addEventListener('click', () => {
            if (this.matrixEffect.isActive) this.matrixEffect.toggle();
            if (this.christmasEffect.isActive) this.christmasEffect.toggle();
        });

        document.getElementById('christmas-pill').addEventListener('click', () => {
            if (this.matrixEffect.isActive) this.matrixEffect.toggle();
            this.christmasEffect.toggle();
        });
    }

    async fetchDashboardData() {
        try {
            console.log('Fetching dashboard data');
            const userId = this.data?.user?.id;
            if (!userId) {
                throw new Error('User ID not found');
            }

            // Fetch base user data
            const baseData = await APIService.fetchUserData(userId);
            
            // Fetch XP transactions separately
            const xpResponse = await APIService.graphqlRequest(GET_XP_TRANSACTIONS, { userId });
            
            // Combine the data
            this.data = {
                ...baseData,
                xpTransactions: xpResponse.transaction
            };
            
            return this.data;
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            throw error;
        }
    }

    async renderOverview() {
        try {
            if (!this.data?.profile) {
                throw new Error('No profile data available');
            }

            const totalXP = this.data.totalXP;
            const completedProjects = this.data.completedProjects;

            // Safely update elements only if they exist
            const totalXPElement = document.getElementById('total-xp');
            if (totalXPElement) {
                totalXPElement.textContent = this.formatXP(totalXP);
            }

            const projectsCompletedElement = document.getElementById('projects-completed');
            if (projectsCompletedElement) {
                projectsCompletedElement.textContent = completedProjects.toString();
            }

            // Continue with activity heatmap
            await this.renderActivityHeatmap();
        } catch (error) {
            console.error('Error rendering overview:', error);
            this.showError('Failed to load profile data');
        }
    }

    calculateTotalXP() {
        return this.data.xpTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    }

    calculateCompletedProjects() {
        return this.data.xpTransactions
            .filter(t => t.object?.type === 'project' && t.amount > 0)
            .length;
    }

    renderLevelProgress(currentLevel, totalXP) {
        const container = document.getElementById('level-progress');
        if (!container) return;

        const nextLevel = currentLevel + 1;
        const currentLevelXP = Math.pow(2, currentLevel - 1) * 1000;
        const nextLevelXP = Math.pow(2, currentLevel) * 1000;
        const progress = Math.min(((totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100, 100);

        const progressBar = document.createElement('div');
        progressBar.className = 'progress-container';
        progressBar.innerHTML = `
            <div class="progress-bar">
                <div class="progress" style="width: ${progress}%"></div>
            </div>
            <div class="progress-labels">
                <span>Level ${currentLevel}</span>
                <span>${Math.round(progress)}%</span>
                <span>Level ${nextLevel}</span>
            </div>
        `;
        container.appendChild(progressBar);
    }

    renderActivityHeatmap() {
        try {
            const container = document.getElementById('activity-heatmap');
            if (!container) return;

            // Clear and add header with summary
            container.innerHTML = `
                <div class="activity-header">
                    <h3>Recent Activity</h3>
                    <div class="activity-summary">
                        <span class="summary-item">
                            <i class="fas fa-clock"></i>
                            Last 6 months
                        </span>
                        <span class="summary-item">
                            <i class="fas fa-star"></i>
                            ${this.data.xpTransactions?.length || 0} activities
                        </span>
                    </div>
                </div>
                <div class="graph-container"></div>
            `;

            const graphContainer = container.querySelector('.graph-container');
            
            if (!this.data.xpTransactions?.length) {
                graphContainer.innerHTML = '<p class="no-data">No recent activity data available</p>';
                return;
            }

            // Process the data
            const activities = this.data.xpTransactions
                .map(t => ({
                    date: new Date(t.createdAt),
                    value: t.amount,
                    project: t.object?.name || 'XP Transaction'
                }))
                .sort((a, b) => a.date - b.date);

            // Set up responsive dimensions
            const containerWidth = graphContainer.clientWidth;
            const margin = {
                top: 20,
                right: Math.min(30, containerWidth * 0.05),
                bottom: 30,
                left: Math.min(60, containerWidth * 0.1)
            };
            const width = containerWidth - margin.left - margin.right;
            const height = Math.min(200, window.innerHeight * 0.3);

            // Create SVG with viewBox for responsiveness
            const svg = d3.select(graphContainer)
                .append('svg')
                .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
                .attr('preserveAspectRatio', 'xMidYMid meet')
                .append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            // Create gradient
            const gradient = svg.append('defs')
                .append('linearGradient')
                .attr('id', `area-gradient-${Date.now()}`) // Unique ID to avoid conflicts
                .attr('gradientUnits', 'userSpaceOnUse')
                .attr('x1', 0)
                .attr('y1', height)
                .attr('x2', 0)
                .attr('y2', 0);

            gradient.append('stop')
                .attr('offset', '0%')
                .attr('stop-color', '#9969FF')
                .attr('stop-opacity', 0.1);

            gradient.append('stop')
                .attr('offset', '50%')
                .attr('stop-color', '#9969FF')
                .attr('stop-opacity', 0.2);

            gradient.append('stop')
                .attr('offset', '100%')
                .attr('stop-color', '#9969FF')
                .attr('stop-opacity', 0.3);

            // Create scales
            const x = d3.scaleTime()
                .domain(d3.extent(activities, d => d.date))
                .range([0, width]);

            const y = d3.scaleLinear()
                .domain([0, d3.max(activities, d => d.value)])
                .range([height, 0]);

            // Add area
            const area = d3.area()
                .x(d => x(d.date))
                .y0(height)
                .y1(d => y(d.value))
                .curve(d3.curveMonotoneX);

            svg.append('path')
                .datum(activities)
                .attr('class', 'area')
                .attr('fill', `url(#area-gradient-${Date.now()})`)
                .attr('d', area);

            // Add line
            const line = d3.line()
                .x(d => x(d.date))
                .y(d => y(d.value))
                .curve(d3.curveMonotoneX);

            svg.append('path')
                .datum(activities)
                .attr('class', 'line')
                .attr('d', line);

            // Create tooltip
            const tooltip = d3.select(graphContainer)
                .append('div')
                .attr('class', 'activity-tooltip')
                .style('opacity', 0);

            // Add interactive dots
            svg.selectAll('.dot')
                .data(activities)
                .enter()
                .append('circle')
                .attr('class', 'dot')
                .attr('cx', d => x(d.date))
                .attr('cy', d => y(d.value))
                .attr('r', 4)
                .attr('fill', '#FFFFFF')
                .attr('stroke', '#9969FF')
                .attr('stroke-width', 2)
                .on('mouseover', function(event, d) {
                    // Enhance dot on hover
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('r', 6)
                        .attr('fill', '#9969FF');

                    // Show tooltip
                    tooltip.transition()
                        .duration(200)
                        .style('opacity', 1);

                    const formattedDate = d.date.toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                    });

                    tooltip.html(`
                        <div class="tooltip-header">${d.project}</div>
                        <div class="tooltip-content">
                            <div class="tooltip-row">
                                <i class="fas fa-trophy"></i>
                                <span>${d.value.toLocaleString()} XP</span>
                            </div>
                            <div class="tooltip-row">
                                <i class="fas fa-calendar"></i>
                                <span>${formattedDate}</span>
                            </div>
                        </div>
                    `)
                    .style('left', `${event.pageX - graphContainer.getBoundingClientRect().left + 10}px`)
                    .style('top', `${event.pageY - graphContainer.getBoundingClientRect().top - 10}px`);
                })
                .on('mouseout', function() {
                    // Reset dot on mouseout
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('r', 4)
                        .attr('fill', '#FFFFFF');

                    // Hide tooltip
                    tooltip.transition()
                        .duration(500)
                        .style('opacity', 0);
                });

            // Add axes with responsive font size
            const fontSize = Math.max(10, Math.min(12, width * 0.02));
            
            // Add X axis
            svg.append('g')
                .attr('class', 'x-axis')
                .attr('transform', `translate(0,${height})`)
                .call(d3.axisBottom(x)
                    .ticks(width < 600 ? 4 : 6)
                    .tickFormat(d3.timeFormat('%b %Y')))
                .style('font-size', `${fontSize}px`);

            // Add Y axis
            svg.append('g')
                .attr('class', 'y-axis')
                .call(d3.axisLeft(y)
                    .ticks(5)
                    .tickFormat(d => `${(d/1000).toFixed(1)}k`))
                .style('font-size', `${fontSize}px`);

            // Add resize handler
            const resizeGraph = () => {
                const newWidth = graphContainer.clientWidth;
                svg.attr('viewBox', `0 0 ${newWidth} ${height + margin.top + margin.bottom}`);
            };

            window.addEventListener('resize', resizeGraph);

        } catch (error) {
            console.error('Error rendering activity heatmap:', error);
            container.innerHTML += '<p class="error">Failed to load activity data</p>';
        }
    }

    calculateLevel(xp) {
        // Level calculation based on XP
        if (!xp) return 1;
        return Math.floor(Math.log2(xp / 1000) + 1);
    }

    formatXP(xp) {
        if (!xp) return '0 XP';
        return `${xp.toLocaleString()} XP`;
    }

    switchView(view) {
        // Hide all panels
        document.querySelectorAll('.panel').forEach(panel => {
            panel.classList.remove('active');
        });

        // Show selected panel
        const selectedPanel = document.getElementById(`${view}-panel`);
        if (selectedPanel) {
            selectedPanel.classList.add('active');
        }

        // Update nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.view === view) {
                item.classList.add('active');
            }
        });

        this.currentView = view;
        this.renderView(view);
    }

    async renderView(view) {
        // Update active state
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });

        // Hide all panels
        document.querySelectorAll('.panel').forEach(panel => {
            panel.classList.remove('active');
        });

        // Show selected panel
        const panel = document.getElementById(`${view}-panel`);
        if (panel) {
            panel.classList.add('active');
        }

        // Render view content
        switch (view) {
            case 'overview':
                await this.renderOverview();
                break;
            case 'progress':
                await this.renderProgress();
                break;
            case 'skills':
                await this.renderSkills();
                break;
            // Comment out audit case
            /*
            case 'audits':
                await this.renderAuditPanels();
                break;
            */
        }
    }

    async renderProgress() {
        try {
            if (!this.data?.xpTransactions?.length) {
                throw new Error('No XP transaction data available');
            }

            // Update stats in header
            const activityCount = this.data.xpTransactions.length;
            const totalXP = this.data.totalXP;
            const monthlyAvg = Math.round(totalXP / 6); // Last 6 months average

            const progressPanel = document.getElementById('progress-panel');
            if (!progressPanel) return;

            // Update stats
            const statsElements = {
                activityCount: progressPanel.querySelector('.activity-count'),
                totalXP: progressPanel.querySelector('.total-xp'),
                velocityAvg: progressPanel.querySelector('.velocity-avg')
            };

            if (statsElements.activityCount) {
                statsElements.activityCount.textContent = `${activityCount.toLocaleString()} learning activities`;
            }
            if (statsElements.totalXP) {
                statsElements.totalXP.textContent = `${totalXP.toLocaleString()} XP total`;
            }
            if (statsElements.velocityAvg) {
                statsElements.velocityAvg.textContent = `${monthlyAvg.toLocaleString()} XP/month`;
            }

            // Render XP Timeline
            const timelineContainer = document.getElementById('xp-timeline');
            if (timelineContainer) {
                timelineContainer.innerHTML = ''; // Clear previous content
                this.renderXPGraph(timelineContainer, this.data.xpTransactions);
            }

            // Render Learning Velocity - Make sure this is called
            const velocityContainer = document.getElementById('learning-velocity');
            if (velocityContainer) {
                velocityContainer.innerHTML = ''; // Clear previous content
                this.renderLearningVelocity(); // Call the velocity visualization
            }

        } catch (error) {
            console.error('Error rendering progress:', error);
            this.showError('Failed to load progress data');
        }
    }

    // Reuse your existing graph rendering logic
    renderXPGraph(container, transactions) {
        try {
            // Set up dimensions
            const margin = { top: 20, right: 120, bottom: 30, left: 60 };
            const width = container.clientWidth - margin.left - margin.right;
            const height = 300 - margin.top - margin.bottom;

            // Create SVG
            const svg = d3.select(container)
                .append('svg')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
                .append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            // Add gradient background
            const gradient = svg.append('defs')
                .append('linearGradient')
                .attr('id', 'area-gradient')
                .attr('gradientUnits', 'userSpaceOnUse')
                .attr('x1', 0)
                .attr('y1', height)
                .attr('x2', 0)
                .attr('y2', 0);

            gradient.append('stop')
                .attr('offset', '0%')
                .attr('stop-color', '#9969FF')
                .attr('stop-opacity', 0.1);

            gradient.append('stop')
                .attr('offset', '50%')
                .attr('stop-color', '#9969FF')
                .attr('stop-opacity', 0.2);

            // Process data - Calculate cumulative XP
            const data = transactions
                .map(t => ({
                    date: new Date(t.createdAt),
                    value: t.amount || 0
                }))
                .sort((a, b) => a.date - b.date)
                .reduce((acc, curr) => {
                    const lastValue = acc.length > 0 ? acc[acc.length - 1].cumulative : 0;
                    acc.push({
                        date: curr.date,
                        value: curr.value,
                        cumulative: lastValue + curr.value
                    });
                    return acc;
                }, []);

            // Create scales
            const x = d3.scaleTime()
                .domain(d3.extent(data, d => d.date))
                .range([0, width]);

            const y = d3.scaleLinear()
                .domain([0, d3.max(data, d => d.cumulative)])
                .range([height, 0]);

            // Add area
            const area = d3.area()
                .x(d => x(d.date))
                .y0(height)
                .y1(d => y(d.cumulative))
                .curve(d3.curveMonotoneX);

            svg.append('path')
                .datum(data)
                .attr('class', 'area')
                .attr('fill', 'url(#area-gradient)')
                .attr('d', area);

            // Add line
            const line = d3.line()
                .x(d => x(d.date))
                .y(d => y(d.cumulative))
                .curve(d3.curveMonotoneX);

            svg.append('path')
                .datum(data)
                .attr('class', 'line')
                .attr('fill', 'none')
                .attr('stroke', '#9969FF')
                .attr('stroke-width', 1.5)
                .attr('d', line);

            // Add interactive dots
            const tooltip = d3.select(container)
                .append('div')
                .attr('class', 'activity-tooltip')
                .style('opacity', 0);

            svg.selectAll('.dot')
                .data(data)
                .enter()
                .append('circle')
                .attr('class', 'dot')
                .attr('cx', d => x(d.date))
                .attr('cy', d => y(d.cumulative))
                .attr('r', 3)
                .attr('fill', '#FFFFFF')
                .attr('stroke', '#9969FF')
                .attr('stroke-width', 1.5)
                .on('mouseover', function(event, d) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('r', 5)
                        .attr('fill', '#9969FF');

                    tooltip.transition()
                        .duration(200)
                        .style('opacity', 1);

                    const tooltipContent = `
                        <div class="tooltip-header">XP Progress</div>
                        <div class="tooltip-content">
                            <div class="tooltip-row">
                                <i class="fas fa-trophy"></i>
                                <span>${d.cumulative.toLocaleString()} XP</span>
                            </div>
                            <div class="tooltip-row">
                                <i class="fas fa-plus-circle"></i>
                                <span>+${d.value.toLocaleString()} XP</span>
                            </div>
                            <div class="tooltip-row">
                                <i class="fas fa-calendar"></i>
                                <span>${d.date.toLocaleDateString()}</span>
                            </div>
                        </div>
                    `;
                    tooltip.html(tooltipContent)
                        .style('left', `${event.pageX - container.getBoundingClientRect().left + 10}px`)
                        .style('top', `${event.pageY - container.getBoundingClientRect().top - 28}px`);
                })
                .on('mouseout', function() {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('r', 3)
                        .attr('fill', '#FFFFFF');

                    tooltip.transition()
                        .duration(500)
                        .style('opacity', 0);
                });

            // Add axes
            const fontSize = Math.max(10, Math.min(12, width * 0.02));
            
            svg.append('g')
                .attr('class', 'x-axis')
                .attr('transform', `translate(0,${height})`)
                .call(d3.axisBottom(x)
                    .ticks(width < 600 ? 4 : 6)
                    .tickFormat(d3.timeFormat('%b %Y')))
                .style('font-size', `${fontSize}px`);

            svg.append('g')
                .attr('class', 'y-axis')
                .call(d3.axisLeft(y)
                    .ticks(5)
                    .tickFormat(d => `${(d/1000).toFixed(1)}k`))
                .style('font-size', `${fontSize}px`);

            // After adding axes, add total XP annotation
            svg.append('text')
                .attr('class', 'total-xp-annotation')
                .attr('x', width + 10)
                .attr('y', 0)
                .attr('dy', '1em')
                .style('fill', '#9969FF')
                .style('font-size', '14px')
                .style('font-weight', 'bold')
                .text(`${d3.max(data, d => d.cumulative).toLocaleString()} XP total`);

        } catch (error) {
            console.error('Error rendering XP graph:', error);
            container.innerHTML = '<div class="error-message">Failed to load XP timeline</div>';
        }
    }

    async renderSkills() {
        try {
            const skillsData = await this.processSkillsData();
            await this.renderSkillsDistribution(skillsData);
            // Comment out skills tree
            // await this.renderSkillsTree(skillsData);
        } catch (error) {
            console.error('Error rendering skills:', error);
            const container = document.getElementById('skills-panel');
            if (container) {
                container.innerHTML = '<div class="error-message">Failed to load skills data</div>';
            }
        }
    }

    async processSkillsData() {
        try {
            const userId = this.data?.user?.id;
            if (!userId) throw new Error('User ID not found');

            const response = await APIService.graphqlRequest(window.Queries.GET_DETAILED_SKILLS, { 
                userId: parseInt(userId) 
            });

            const skillCategories = {
                'Backend': { value: 0, projects: [] },
                'Frontend': { value: 0, projects: [] },
                'Algorithms': { value: 0, projects: [] },
                'Databases': { value: 0, projects: [] },
                'System Design': { value: 0, projects: [] }
            };

            // Process completed projects
            response.progress.forEach(project => {
                if (!project.object || !project.grade) return;

                // Get categories for this project
                const categories = this.getProjectCategory(project.object.name);
                
                // Distribute project value across all applicable categories
                const valuePerCategory = project.grade / categories.length;
                
                categories.forEach(category => {
                    if (skillCategories[category]) {
                        skillCategories[category].value += valuePerCategory;
                        skillCategories[category].projects.push({
                            name: project.object.name,
                            grade: project.grade,
                            date: new Date(project.updatedAt),
                            type: project.object.type,
                            categories: categories.filter(c => c !== category) // Other categories
                        });
                    }
                });
            });

            // Calculate percentages
            const totalValue = Object.values(skillCategories)
                .reduce((sum, cat) => sum + cat.value, 0);

            Object.keys(skillCategories).forEach(key => {
                const category = skillCategories[key];
                category.percentage = totalValue > 0 ? 
                    Math.round((category.value / totalValue) * 100) : 0;
                
                // Sort projects by date and grade
                category.projects.sort((a, b) => {
                    if (b.date - a.date === 0) {
                        return b.grade - a.grade;
                    }
                    return b.date - a.date;
                });
            });

            return skillCategories;
        } catch (error) {
            console.error('Error processing skills data:', error);
            return {};
        }
    }

    getProjectCategory(projectName, attrs = {}) {
        // Project categorization based on name and common patterns
        const projectCategories = {
            'Backend': [
                'go', 'api', 'server', 'net-cat', 'forum-backend',
                'groupie-tracker', 'real-time-forum'
            ],
            'Frontend': [
                'js', 'javascript', 'dom', 'web', 'html', 'css',
                'forum-frontend', 'stylize'
            ],
            'Algorithms': [
                'sort', 'algorithm', 'ascii-art', 'blockchain',
                'push-swap'
            ],
            'Databases': [
                'sql', 'database', 'forum', 'social-network'
            ],
            'System Design': [
                'docker', 'architecture', 'lem-in',     // Added lem-in as system design
                'real-time-forum',                      // Complex projects involving system design
                'forum',                                // Forum projects involve system architecture
                'groupie-tracker',                      // Involves API design and system architecture
                'social-network'                        // Complex system design project
            ]
        };

        const projectNameLower = projectName.toLowerCase();
        
        // Count project in multiple categories if applicable
        let categories = new Set();
        
        for (const [category, patterns] of Object.entries(projectCategories)) {
            if (patterns.some(pattern => projectNameLower.includes(pattern))) {
                categories.add(category);
            }
        }

        // Special multi-category projects
        const multiCategoryProjects = {
            'real-time-forum': ['Backend', 'Frontend', 'System Design', 'Databases'],
            'forum': ['Backend', 'System Design', 'Databases'],
            'social-network': ['Backend', 'Frontend', 'System Design', 'Databases'],
            'groupie-tracker': ['Backend', 'Frontend', 'System Design'],
            'lem-in': ['Algorithms', 'System Design']
        };

        if (multiCategoryProjects[projectName]) {
            multiCategoryProjects[projectName].forEach(cat => categories.add(cat));
        }

        return Array.from(categories);
    }

    renderSkillsDistribution(skillsData) {
        const container = document.getElementById('skills-radar');
        if (!container) return;
        container.innerHTML = '<h3>Skills Distribution</h3>';

        // Set up dimensions
        const margin = { top: 30, right: 120, bottom: 30, left: 120 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = 300 - margin.top - margin.bottom;

        // Create SVG
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Create gradient
        const gradient = svg.append('defs')
            .append('linearGradient')
            .attr('id', 'skill-bar-gradient')
            .attr('x1', '0%')
            .attr('x2', '100%');

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#9969FF')
            .attr('stop-opacity', 0.8);

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#9969FF')
            .attr('stop-opacity', 0.4);

        // Process data
        const data = Object.entries(skillsData).map(([name, data]) => ({
            name,
            value: data.percentage || 0,
            projects: data.projects || []
        })).sort((a, b) => b.value - a.value);

        // Create scales
        const y = d3.scaleBand()
            .domain(data.map(d => d.name))
            .range([0, height])
            .padding(0.3);

        const x = d3.scaleLinear()
            .domain([0, 100])
            .range([0, width]);

        // Add bars
        const bars = svg.selectAll('.skill-bar')
            .data(data)
            .enter()
            .append('g')
            .attr('class', 'skill-bar');

        // Add bar background
        bars.append('rect')
            .attr('class', 'bar-bg')
            .attr('x', 0)
            .attr('y', d => y(d.name))
            .attr('width', width)
            .attr('height', y.bandwidth())
            .attr('fill', '#2A2A2A')
            .attr('rx', 4);

        // Add actual bars
        bars.append('rect')
            .attr('class', 'bar')
            .attr('x', 0)
            .attr('y', d => y(d.name))
            .attr('width', d => x(d.value))
            .attr('height', y.bandwidth())
            .attr('fill', 'url(#skill-bar-gradient)')
            .attr('rx', 4);

        // Add skill names
        bars.append('text')
            .attr('class', 'skill-label')
            .attr('x', -10)
            .attr('y', d => y(d.name) + y.bandwidth() / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'end')
            .style('fill', 'white')
            .style('font-size', '14px')
            .text(d => d.name);

        // Add percentage labels
        bars.append('text')
            .attr('class', 'percentage-label')
            .attr('x', d => x(d.value) + 5)
            .attr('y', d => y(d.name) + y.bandwidth() / 2)
            .attr('dy', '0.35em')
            .style('fill', 'white')
            .style('font-size', '12px')
            .text(d => `${d.value}%`);

        // Add interactivity
        bars.on('mouseover', function(event, d) {
            const bar = d3.select(this);
            
            // Highlight bar
            bar.select('.bar')
                .transition()
                .duration(200)
                .attr('fill', '#9969FF');

            // Show tooltip with projects
            const tooltip = d3.select(container)
                .append('div')
                .attr('class', 'skill-tooltip')
                .style('position', 'absolute')
                .style('background', 'rgba(25, 25, 25, 0.95)')
                .style('padding', '10px')
                .style('border-radius', '4px')
                .style('border', '1px solid #9969FF')
                .style('pointer-events', 'none')
                .style('z-index', '100');

            let tooltipContent = `
                <div style="font-weight: bold; color: #9969FF; margin-bottom: 5px;">
                    ${d.name}
                </div>
                <div style="margin-bottom: 5px;">
                    Proficiency: ${d.value}%
                </div>
            `;

            if (d.projects.length > 0) {
                tooltipContent += `
                    <div style="font-size: 12px; margin-top: 5px;">
                        <div style="color: #9969FF; margin-bottom: 3px;">Completed Projects:</div>
                        ${d.projects.slice(0, 3).map(p => `
                            <div style="margin-bottom: 4px;">
                                <div style="color: #fff;">${p.name}</div>
                                <div style="color: #9969FF; font-size: 11px;">
                                    Grade: ${p.grade}% | ${new Date(p.date).toLocaleDateString()}
                                </div>
                                ${p.categories?.length ? `
                                    <div style="color: #666; font-size: 10px;">
                                        Also contributes to: ${p.categories.join(', ')}
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            tooltip.html(tooltipContent)
                .style('left', `${event.pageX + 10}px`)
                .style('top', `${event.pageY - 28}px`);
        })
        .on('mouseout', function() {
            // Reset bar color
            d3.select(this)
                .select('.bar')
                .transition()
                .duration(200)
                .attr('fill', 'url(#skill-bar-gradient)');

            // Remove tooltip
            d3.selectAll('.skill-tooltip').remove();
        });
    }

    renderSkillsTree() {
        const container = document.getElementById('skills-tree');
        const margin = { top: 20, right: 90, bottom: 30, left: 90 };
            const width = container.clientWidth - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;

        // Sample tree data (replace with actual data)
        const treeData = {
            name: "Skills",
            children: [
                {
                    name: "Backend",
                    children: [
                        { name: "Go", value: 85 },
                        { name: "SQL", value: 75 },
                        { name: "APIs", value: 80 }
                    ]
                },
                {
                    name: "Frontend",
                    children: [
                        { name: "JavaScript", value: 70 },
                        { name: "HTML/CSS", value: 75 },
                        { name: "React", value: 65 }
                    ]
                },
                {
                    name: "DevOps",
                    children: [
                        { name: "Docker", value: 60 },
                        { name: "Git", value: 80 },
                        { name: "CI/CD", value: 55 }
                    ]
                }
            ]
        };

        // Clear container
        container.innerHTML = '';

            // Create SVG
        const svg = d3.select('#skills-tree')
                .append('svg')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
                .append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

        // Create tree layout
        const tree = d3.tree().size([height, width]);

        // Create hierarchy
        const root = d3.hierarchy(treeData);
        const treeLayout = tree(root);

        // Add links
        svg.selectAll('.link')
            .data(treeLayout.links())
            .enter()
            .append('path')
            .attr('class', 'link')
            .attr('d', d3.linkHorizontal()
                .x(d => d.y)
                .y(d => d.x))
            .attr('fill', 'none')
            .attr('stroke', 'var(--border-color)');

        // Add nodes
        const nodes = svg.selectAll('.node')
            .data(treeLayout.descendants())
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.y},${d.x})`);

        // Add node circles
        nodes.append('circle')
            .attr('r', d => d.data.value ? 8 : 5)
            .attr('fill', d => d.data.value ? 'var(--accent-purple)' : 'var(--text-secondary)')
            .on('mouseover', function(event, d) {
                if (d.data.value) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('r', 10);

                    tooltip.transition()
                        .duration(200)
                        .style('opacity', 0.9);

                    tooltip.html(`
                        <div class="tooltip-content">
                            <strong>${d.data.name}</strong>
                            <div>Proficiency: ${d.data.value}%</div>
                        </div>
                    `)
                    .style('left', `${event.pageX + 10}px`)
                    .style('top', `${event.pageY - 28}px`);
                }
            })
            .on('mouseout', function(event, d) {
                if (d.data.value) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('r', 8);

                    tooltip.transition()
                        .duration(500)
                        .style('opacity', 0);
                }
            });

        // Add labels
        nodes.append('text')
            .attr('dy', '0.31em')
            .attr('x', d => d.children ? -8 : 8)
            .attr('text-anchor', d => d.children ? 'end' : 'start')
            .text(d => d.data.name)
            .attr('fill', 'var(--text-primary)');

        // Add tooltip
        const tooltip = d3.select('#skills-tree')
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);
    }

    renderAuditPanels() {
        this.renderAuditDonut();
        this.renderPeerComparison();
    }

    renderAuditDonut() {
        // Clear existing content first
        const container = document.getElementById('audit-donut');
        if (!container) return;
        container.innerHTML = '';

        const margin = { top: 20, right: 20, bottom: 20, left: 20 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = 300 - margin.top - margin.bottom;
        const radius = Math.min(width, height) / 2;

        // Get audit data from your data source
        const auditData = this.getAuditData();

        // Create SVG
        const svg = d3.select('#audit-donut')
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${width/2 + margin.left},${height/2 + margin.top})`);

        // Create arc generator
        const arc = d3.arc()
            .innerRadius(radius * 0.7)
            .outerRadius(radius);

        // Create pie generator
        const pie = d3.pie()
            .value(d => d.value)
            .sort(null);

        // Prepare data
        const data = pie([
            { name: 'Completed', value: auditData.ratio * 100 },
            { name: 'Remaining', value: 100 - (auditData.ratio * 100) }
        ]);

        // Add arcs
        svg.selectAll('path')
            .data(data)
            .enter()
            .append('path')
            .attr('d', arc)
            .attr('class', 'arc')
            .style('fill', (d, i) => i === 0 ? '#9969FF' : '#2A2A2A');

        // Add center text
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('class', 'donut-center-text')
            .attr('dy', '0em')
            .style('font-size', '2.5em')
            .style('fill', 'white')
            .text(`${Math.round(auditData.ratio * 100)}%`);

        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('class', 'donut-center-subtext')
            .attr('dy', '2em')
            .style('font-size', '0.9em')
            .style('fill', '#999')
            .text('Completion Rate');

        // Add explanation panel
        const explanationDiv = document.createElement('div');
        explanationDiv.className = 'audit-explanation';
        explanationDiv.innerHTML = `
            <div class="audit-stats-container">
                <div class="audit-stat-box">
                    <h3>Audits Received</h3>
                    <div class="stat-numbers">
                        <div class="main-stat">${auditData.received.total}</div>
                        <div class="sub-stat">Passed: ${auditData.received.passed}</div>
                    </div>
                    <div class="stat-detail">Success rate: ${(auditData.received.ratio * 100).toFixed(1)}%</div>
                </div>
                <div class="audit-stat-box">
                    <h3>Audits Given</h3>
                    <div class="stat-numbers">
                        <div class="main-stat">${auditData.given.total}</div>
                        <div class="sub-stat">On Time: ${auditData.given.onTime}</div>
                    </div>
                    <div class="stat-detail">Completion rate: ${((auditData.given.completed/auditData.given.total) * 100).toFixed(1)}%</div>
                </div>
                <div class="audit-stat-box">
                    <h3>Performance</h3>
                    <div class="stat-numbers">
                        <div class="main-stat">${auditData.details.xp.toLocaleString()}</div>
                        <div class="sub-stat">XP Earned</div>
                    </div>
                    <div class="stat-detail">Streak: ${auditData.details.streak} days</div>
                </div>
            </div>
            <div class="audit-info-box">
                <h4>About Audit Performance</h4>
                <ul>
                    <li><strong>Completion Rate:</strong> Shows the percentage of required audits you've completed</li>
                    <li><strong>Success Rate:</strong> Percentage of your projects that passed peer review</li>
                    <li><strong>On-Time Rate:</strong> Percentage of audits completed within the deadline</li>
                </ul>
            </div>
        `;
        container.appendChild(explanationDiv);
    }

    renderPeerComparison() {
        const container = document.getElementById('peer-comparison');
        if (!container) return;
        container.innerHTML = '';

        const margin = { top: 20, right: 30, bottom: 40, left: 40 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = 300 - margin.top - margin.bottom;

        const peerData = this.getPeerComparisonData().distribution;

        // Create SVG
        const svg = d3.select('#peer-comparison')
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Create scales
        const x = d3.scaleBand()
            .range([0, width])
            .padding(0.1)
            .domain(peerData.map(d => d.category));

        const y = d3.scaleLinear()
            .range([height, 0])
            .domain([0, 100]);

        // Add bars
        svg.selectAll('.bar')
            .data(peerData)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.category))
            .attr('width', x.bandwidth())
            .attr('y', d => y(d.value))
            .attr('height', d => height - y(d.value))
            .style('fill', '#9969FF')
            .style('opacity', 0.8);

        // Add axes
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .style('fill', '#999')
            .style('font-size', '12px');

        svg.append('g')
            .call(d3.axisLeft(y).ticks(5))
            .selectAll('text')
            .style('fill', '#999')
            .style('font-size', '12px');
    }

    // Helper methods to get data
    getAuditData() {
        return {
            received: {
                total: 85,
                passed: 75,
                ratio: 0.88
            },
            given: {
                total: 80,
                completed: 75,
                onTime: 70
            },
            details: {
                xp: 12500,
                lastWeek: 5,
                streak: 7
            }
        };
    }

    getPeerComparisonData() {
        return {
            distribution: [
                { category: 'Below Average', value: 20, count: 150 },
                { category: 'Average', value: 45, count: 300 },
                { category: 'Above Average', value: 35, count: 250 }
            ],
            userPosition: {
                percentile: 88,
                ranking: 125,
                totalPeers: 700
            }
        };
    }

    async verifyDataAccuracy() {
        try {
            console.log('Starting data verification...');
            
            // Get profile data first
            const profileData = await APIService.graphqlRequest(GET_USER_PROFILE);
            console.log('Profile Data:', profileData);

            if (!profileData?.user_public_view?.[0]) {
                throw new Error('Profile data not found');
            }

            const profile = profileData.user_public_view[0];
            
            // Compare with displayed data
            this.compareDisplayedData({
                level: parseInt(profile.level) || 1,
                expectedLevel: parseInt(profile.expectedLevel) || 1,
                xp: parseInt(profile.xp) || 0,
                skillsProgress: parseInt(profile.skillsProgress) || 0
            });

        } catch (error) {
            console.error('Data verification failed:', error);
        }
    }

    compareDisplayedData(serverData) {
        console.log('Server Data for Verification:', serverData); // Debug log

        // Compare Level
        const displayedLevel = document.getElementById('current-level')?.textContent;
        const serverLevel = serverData.level.toString();
        console.log('Level Comparison:', {
            displayed: displayedLevel,
            server: serverLevel,
            expectedLevel: serverData.expectedLevel
        });

        // Compare XP
        const displayedXP = document.getElementById('total-xp')?.textContent;
        const serverXP = this.formatXP(this.data.totalXP);
        console.log('XP Comparison:', {
            displayed: displayedXP,
            server: serverXP,
            rawXP: this.data.totalXP
        });

        // Compare Projects
        const displayedProjects = document.getElementById('projects-completed')?.textContent;
        console.log('Projects Comparison:', {
            displayed: displayedProjects,
            server: this.data.completedProjects
        });
    }

    async renderActivityGraph() {
        try {
            const container = document.getElementById('activity-heatmap');
            if (!container) {
                console.error('Activity heatmap container not found');
                return;
            }

            // Define fontSize here
            const fontSize = Math.max(10, Math.min(12, container.clientWidth * 0.02));

            // Keep the existing h3 title and add a container for the graph
            container.innerHTML = `
                <h3>Recent Activity</h3>
                <div class="graph-container"></div>
            `;

            const graphContainer = container.querySelector('.graph-container');

            // Fetch XP transactions if not already available
            if (!this.data.xpTransactions) {
                const xpData = await APIService.graphqlRequest(`
                    query GetXPTransactions($userId: Int!) {
                        transaction(
                            where: { 
                                userId: {_eq: $userId}, 
                                type: {_eq: "xp"},
                                createdAt: {_gte: "${new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()}"}
                            }
                            order_by: {createdAt: asc}
                        ) {
                            id
                            amount
                            createdAt
                            object {
                                name
                                type
                            }
                        }
                    }
                `, { userId: parseInt(this.data.user.id) });

                this.data.xpTransactions = xpData?.transaction || [];
            }

            if (!this.data.xpTransactions.length) {
                graphContainer.innerHTML = '<p class="no-data">No recent activity data available</p>';
                return;
            }

            // Process data
            const data = this.data.xpTransactions
                .map(t => ({
                    date: new Date(t.createdAt),
                    amount: t.amount || 0,
                    project: t.object?.name || 'XP Transaction'
                }))
                .sort((a, b) => a.date - b.date);

            // Set up dimensions
            const margin = { top: 20, right: 120, bottom: 30, left: 60 };
            const width = graphContainer.clientWidth - margin.left - margin.right;
            const height = 200 - margin.top - margin.bottom;

            // Create SVG
            const svg = d3.select(graphContainer)
                .append('svg')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
                .append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            // Create scales
            const x = d3.scaleTime()
                .domain(d3.extent(data, d => d.date))
                .range([0, width]);

            const y = d3.scaleLinear()
                .domain([0, d3.max(data, d => d.amount)])
                .range([height, 0]);

            // Add area
            svg.append('path')
                .datum(data)
                .attr('class', 'area')
                .attr('fill', 'var(--accent-color)')
                .attr('fill-opacity', '0.1')
                .attr('d', d3.area()
                    .x(d => x(d.date))
                    .y0(height)
                    .y1(d => y(d.amount))
                    .curve(d3.curveMonotoneX));

            // Add line
            svg.append('path')
                .datum(data)
                .attr('class', 'activity-line')
                .attr('stroke', 'var(--accent-color)')
                .attr('stroke-width', 1.5)
                .attr('d', d3.line()
                    .x(d => x(d.date))
                    .y(d => y(d.amount))
                    .curve(d3.curveMonotoneX));

            // Add interactive dots
            const dots = svg.selectAll('.dot')
                .data(data)
                .enter()
                .append('circle')
                .attr('class', 'dot')
                .attr('cx', d => x(d.date))
                .attr('cy', d => y(d.amount))
                .attr('r', 4)
                .attr('fill', 'var(--accent-color)')
                .attr('stroke', 'var(--accent-color)')
                .attr('stroke-width', 2);

            // Add tooltip
            const tooltip = d3.select(graphContainer)
                .append('div')
                .attr('class', 'tooltip')
                .style('opacity', 0);

            // Add interactivity
            dots.on('mouseover', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 6)
                    .attr('fill', 'var(--accent-color)');

                tooltip.transition()
                    .duration(200)
                    .style('opacity', 1);

                tooltip.html(`
                    <strong>${d.project}</strong><br/>
                    XP: ${d.amount.toLocaleString()}<br/>
                    Date: ${d.date.toLocaleDateString()}
                `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 4)
                    .attr('fill', 'var(--accent-color)');

                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            });

            // Add axes
            svg.append('g')
                .attr('class', 'x-axis')
                .attr('transform', `translate(0,${height})`)
                .call(d3.axisBottom(x)
                    .ticks(6)
                    .tickFormat(d3.timeFormat('%b %Y')))
                .style('font-size', `${fontSize}px`);

            svg.append('g')
                .attr('class', 'y-axis')
                .call(d3.axisLeft(y)
                    .ticks(5)
                    .tickFormat(d => `${(d/1000).toFixed(1)}k`))
                .style('font-size', `${fontSize}px`);

        } catch (error) {
            console.error('Error rendering activity graph:', error);
            if (container) {  // Check if container exists before using it
                container.innerHTML += '<p class="error">Failed to load activity data</p>';
            }
        }
    }

    updateStats(data) {
        // Helper function to animate value updates
        const animateValue = (element, value, format = null) => {
            const formattedValue = format ? format(value) : value;
            element.textContent = formattedValue;
            element.classList.add('updating');
            setTimeout(() => element.classList.remove('updating'), 500);
        };

        // Format XP with commas and 'XP' suffix
        const formatXP = (xp) => `${xp.toLocaleString()} XP`;

        // Update Total XP
        const totalXPElement = document.getElementById('total-xp');
        if (totalXPElement && data.totalXP) {
            animateValue(totalXPElement, data.totalXP, formatXP);
        }

        // Update Current Level
        const levelElement = document.getElementById('current-level');
        if (levelElement && data.level) {
            animateValue(levelElement, data.level);
        }

        // Update Projects Completed
        const projectsElement = document.getElementById('projects-completed');
        if (projectsElement && data.completedProjects) {
            animateValue(projectsElement, data.completedProjects);
        }
    }

    async updateDashboardStats() {
        try {
            // Format numbers with commas
            const formatNumber = (num) => num.toLocaleString();

            // Update Overview stats
            document.getElementById('total-xp').textContent = `${formatNumber(this.data.totalXP)} XP`;
            document.getElementById('current-level').textContent = this.data.level;
            document.getElementById('projects-completed').textContent = this.data.completedProjects;

            // Update Progress section stats
            const activityCount = this.data.xpTransactions?.length || 0;
            document.getElementById('activity-count').textContent = `${formatNumber(activityCount)} learning activities`;
            document.getElementById('total-xp-progress').textContent = `${formatNumber(this.data.totalXP)} XP total`;

            // Calculate and update velocity
            const monthlyAverage = this.calculateMonthlyXPAverage();
            document.getElementById('velocity-avg').textContent = `${formatNumber(monthlyAverage)} XP/month`;
        } catch (error) {
            console.error('Error updating dashboard stats:', error);
        }
    }

    calculateMonthlyXPAverage() {
        if (!this.data.xpTransactions?.length) return 0;

        // Group XP by month
        const monthlyXP = this.data.xpTransactions.reduce((acc, transaction) => {
            const month = new Date(transaction.createdAt).toISOString().slice(0, 7);
            acc[month] = (acc[month] || 0) + transaction.amount;
            return acc;
        }, {});

        // Calculate average
        const months = Object.keys(monthlyXP).length;
        const totalXP = Object.values(monthlyXP).reduce((a, b) => a + b, 0);
        
        return Math.round(totalXP / months);
    }

    // Update the dots in the D3 chart
    renderXPTimeline() {
        // ... existing D3 setup code ...

        // Update dot size on hover using attributes instead of CSS
        dots.on('mouseover', function() {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('r', 6)  // Set radius using attr instead of CSS
                .attr('fill', '#9969FF');
        })
        .on('mouseout', function() {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('r', 3)  // Reset radius
                .attr('fill', '#FFFFFF');
        });

        // ... rest of the chart code ...
    }

    // Add Learning Velocity visualization
    renderLearningVelocity() {
        try {
            const container = document.getElementById('learning-velocity');
            if (!container || !this.data?.xpTransactions?.length) return;

            container.innerHTML = '';

            // Set up dimensions
            const margin = { top: 20, right: 120, bottom: 30, left: 60 };
            const width = container.clientWidth - margin.left - margin.right;
            const height = 300 - margin.top - margin.bottom;

            // Create SVG
            const svg = d3.select(container)
                .append('svg')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
                .append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            // Add gradient for bars
            const barGradient = svg.append('defs')
                .append('linearGradient')
                .attr('id', 'bar-gradient')
                .attr('gradientUnits', 'userSpaceOnUse')
                .attr('x1', 0)
                .attr('y1', height)
                .attr('x2', 0)
                .attr('y2', 0);

            barGradient.append('stop')
                .attr('offset', '0%')
                .attr('stop-color', '#9969FF')
                .attr('stop-opacity', 0.6);

            barGradient.append('stop')
                .attr('offset', '100%')
                .attr('stop-color', '#9969FF')
                .attr('stop-opacity', 0.8);

            // Calculate monthly XP
            const monthlyData = this.data.xpTransactions.reduce((acc, t) => {
                const month = new Date(t.createdAt).toISOString().slice(0, 7);
                acc[month] = (acc[month] || 0) + (t.amount || 0);
                return acc;
            }, {});

            // Convert to array and sort
            const data = Object.entries(monthlyData)
                .map(([month, xp]) => ({
                    date: new Date(month),
                    value: xp
                }))
                .sort((a, b) => a.date - b.date);

            // Create scales
            const x = d3.scaleBand()
                .domain(data.map(d => d.date))
                .range([0, width])
                .padding(0.2);

            const y = d3.scaleLinear()
                .domain([0, d3.max(data, d => d.value)])
                .range([height, 0]);

            // Add bars
            const tooltip = d3.select(container)
                .append('div')
                .attr('class', 'activity-tooltip')
                .style('opacity', 0);

            svg.selectAll('rect')
                .data(data)
                .enter()
                .append('rect')
                .attr('x', d => x(d.date))
                .attr('y', d => y(d.value))
                .attr('width', x.bandwidth())
                .attr('height', d => height - y(d.value))
                .attr('fill', 'url(#bar-gradient)')
                .attr('rx', 4)
                .on('mouseover', function(event, d) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('fill', '#9969FF');

                    tooltip.transition()
                        .duration(200)
                        .style('opacity', 1);

                    const tooltipContent = `
                        <div class="tooltip-header">Monthly Progress</div>
                        <div class="tooltip-content">
                            <div class="tooltip-row">
                                <i class="fas fa-trophy"></i>
                                <span>${d.value.toLocaleString()} XP</span>
                            </div>
                            <div class="tooltip-row">
                                <i class="fas fa-calendar"></i>
                                <span>${d.date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
                            </div>
                        </div>
                    `;
                    tooltip.html(tooltipContent)
                        .style('left', `${event.pageX - container.getBoundingClientRect().left + 10}px`)
                        .style('top', `${event.pageY - container.getBoundingClientRect().top - 28}px`);
                })
                .on('mouseout', function() {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('fill', 'url(#bar-gradient)');

                    tooltip.transition()
                        .duration(500)
                        .style('opacity', 0);
                });

            // Add axes
            const fontSize = Math.max(10, Math.min(12, width * 0.02));

            svg.append('g')
                .attr('class', 'x-axis')
                .attr('transform', `translate(0,${height})`)
                .call(d3.axisBottom(x)
                    .tickFormat(d3.timeFormat('%b %Y')))
                .style('font-size', `${fontSize}px`);

            svg.append('g')
                .attr('class', 'y-axis')
                .call(d3.axisLeft(y)
                    .ticks(5)
                    .tickFormat(d => `${(d/1000).toFixed(1)}k`))
                .style('font-size', `${fontSize}px`);

            // After adding axes, add monthly average annotation
            const monthlyAvg = Math.round(this.data.totalXP / 6);
            svg.append('text')
                .attr('class', 'monthly-avg-annotation')
                .attr('x', width + 10)
                .attr('y', 0)
                .attr('dy', '1em')
                .style('fill', '#9969FF')
                .style('font-size', '14px')
                .style('font-weight', 'bold')
                .text(`${monthlyAvg.toLocaleString()} XP/month`);

        } catch (error) {
            console.error('Error rendering learning velocity:', error);
            container.innerHTML = '<div class="error-message">Failed to load learning velocity</div>';
        }
    }

    updateDetailsPanel(skillData, container) {
        const projectsList = skillData.projects
            .slice(0, 5)
            .map(project => `
                <div class="project-card">
                    <div class="project-header">
                        <span class="project-name">${project.name}</span>
                        <span class="project-grade">${project.grade}%</span>
                    </div>
                    <div class="project-date">
                        ${new Date(project.date).toLocaleDateString()}
                    </div>
                    ${project.categories?.length ? `
                        <div class="project-categories">
                            Also contributes to: ${project.categories.join(', ')}
                        </div>
                    ` : ''}
                </div>
            `).join('');

        container.innerHTML = `
            <div class="skill-details-header">
                <h4>${skillData.name}</h4>
                <span class="skill-percentage">${skillData.value}% Proficiency</span>
            </div>
            <div class="recent-projects">
                <h5>Recent Projects</h5>
                ${projectsList || '<p>No projects completed yet</p>'}
            </div>
        `;
    }
}
