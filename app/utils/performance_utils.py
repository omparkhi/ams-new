# app/utils/performance_utils.py
import time
import tracemalloc
import logging
import functools

try:
    import psutil
except ImportError:
    psutil = None

# Set up logging to a file
logging.basicConfig(filename='function_log.txt', level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def measure_performance(func):
    @functools.wraps(func)  # Preserve the original function name and docstring
    def wrapper(*args, **kwargs):
        start_time = time.perf_counter()

        # Memory usage tracking using psutil if available
        start_memory = 0
        if psutil:
            try:
                process = psutil.Process()
                start_memory = process.memory_info().rss
            except Exception:
                pass

        # Start tracking memory allocations
        try:
            tracemalloc.start()
        except Exception:
            pass

        try:
            result = func(*args, **kwargs)
        except Exception as e:
            if tracemalloc.is_tracing():
                tracemalloc.stop()
            raise e

        end_time = time.perf_counter()
        end_memory = 0
        if psutil:
            try:
                end_memory = process.memory_info().rss
            except Exception:
                pass

        snapshot = None
        if tracemalloc.is_tracing():
            try:
                snapshot = tracemalloc.take_snapshot()
            except Exception:
                pass
            tracemalloc.stop()

        execution_time = end_time - start_time
        memory_usage = end_memory - start_memory

        logging.info(f"Function: {func.__name__}")
        logging.info(f"Execution time: {execution_time:.4f} seconds")
        logging.info(f"Memory usage: {memory_usage} bytes")

        return result
    return wrapper
