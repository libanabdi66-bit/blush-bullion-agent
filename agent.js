// Basic Node.js agent module

/**
 * A simple agent class for handling tasks
 */
class Agent {
  constructor(name) {
    this.name = name;
    this.status = 'idle';
  }

  /**
   * Execute a task
   * @param {string} task - The task to execute
   * @returns {Promise<string>} - Result of the task
   */
  async execute(task) {
    this.status = 'busy';
    console.log(`[${this.name}] Executing: ${task}`);
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.status = 'idle';
    return `Task completed: ${task}`;
  }

  /**
   * Get current status
   * @returns {string} - Current agent status
   */
  getStatus() {
    return this.status;
  }
}

// Export the Agent class
module.exports = Agent;

// Example usage when run directly
if (require.main === module) {
  const agent = new Agent('TestAgent');
  
  console.log(`Agent created: ${agent.name}`);
  console.log(`Initial status: ${agent.getStatus()}`);
  
  agent.execute('Sample Task')
    .then(result => console.log(result))
    .catch(err => console.error(err));
}
