# app/utils/performance_utils.py
import time
import psutil
import tracemalloc
import logging
import functools

# Set up logging to a file
logging.basicConfig(filename='function_log.txt', level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def measure_performance(func):
    @functools.wraps(func)  # Preserve the original function name and docstring
    def wrapper(*args, **kwargs):

        print(f"Starting performance measurement for {func.__name__}")
        start_time = time.perf_counter()

        # Memory usage tracking using psutil
        process = psutil.Process()
        start_memory = process.memory_info().rss
        
        # Start tracking memory allocations (Important to start it here!)
        tracemalloc.start()

        try:
            result = func(*args, **kwargs)
        except Exception as e:
            # If an exception occurs, stop tracemalloc to avoid memory leaks
            tracemalloc.stop()
            raise e

        # End performance tracking after function execution
        end_time = time.perf_counter()
        end_memory = process.memory_info().rss
        
        # Take snapshot of memory allocations only if tracemalloc was started
        if tracemalloc.is_tracing():
            snapshot = tracemalloc.take_snapshot()
        else:
            snapshot = None  # If tracemalloc isn't tracing, no snapshot

        tracemalloc.stop()  # Stop memory tracking

        execution_time = end_time - start_time
        memory_usage = end_memory - start_memory

        # Log the performance data
        logging.info(f"Function: {func.__name__}")
        logging.info(f"Execution time: {execution_time:.4f} seconds")
        logging.info(f"Memory usage: {memory_usage} bytes")
        if snapshot:
            logging.info(f"I/O snapshot: {snapshot}")
        else:
            logging.info(f"I/O snapshot: Not available")

        return result
    return wrapper
